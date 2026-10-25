/**
 * Состояние связки и вид двух состояний. AGENTS.md (Solid), «Связка».
 *
 * - Состояние — сигнал на свойство, значение отдаётся как есть: ядро отдаёт
 *   значения, и сменившееся приходит новым объектом (AGENTS.md, «Контракт
 *   границы core → ui»). Стор Solid оборачивал каждый вложенный объект —
 *   ячейки строки, их `aria` и `dataset` — в прокси с сигналом на прочитанное
 *   свойство, которое никогда не сменится. Как `shallowRef` у Vue.
 * - Сигнал заводит первое чтение свойства: разметка читает меньше половины
 *   свойств связки, а подписка отдаёт значение каждого.
 * - Вид двух контекстов — прокси, которое читает свойство у состояния на
 *   каждое чтение: спред прочёл бы его один раз, в теле компонента, а геттеры
 *   по ключам потеряли бы свойства, незаданные к сборке. Одноимённых у
 *   компонента и фасада нет — имена фасада префиксуются.
 */

import { createSignal, type Accessor, type Setter } from 'solid-js'

type TSignal = [Accessor<unknown>, Setter<unknown>]

/** Значения и сигналы свойств — за прокси состояния. */
class TShallowState {
	/** Записанные, но ещё не прочитанные — без сигнала. */
	private readonly _values = new Map<PropertyKey, unknown>()
	/** Прочитанные записанные. */
	private readonly _signals = new Map<PropertyKey, TSignal>()
	/** Прочитанные до записи: подписка связки отдаёт каждое свойство сразу, и здесь — чужие. */
	private readonly _unwritten = new Map<PropertyKey, TSignal>()

	/** Свойство записывали: у связки — одно из её свойств, с подписки. */
	written(key: PropertyKey): boolean {
		return this._values.has(key) || this._signals.has(key)
	}

	read(key: PropertyKey): unknown {
		return this._signalOf(key)[0]()
	}

	write(name: PropertyKey, value: unknown): void {
		const signal = this._signals.get(name) ?? this._adopt(name)

		// Значение-функцию сеттер сигнала счёл бы updater'ом
		if (signal) signal[1](() => value)
		else this._values.set(name, value)
	}

	private _signalOf(key: PropertyKey): TSignal {
		const signal = this._signals.get(key) ?? this._unwritten.get(key)

		if (signal) return signal

		const values = this._values
		const created = createSignal<unknown>(values.get(key), { internal: true })

		if (values.delete(key)) this._signals.set(key, created)
		else this._unwritten.set(key, created)

		return created
	}

	/** Свойство, прочитанное до записи, записано: его сигнал — к записанным. */
	private _adopt(name: PropertyKey): TSignal | undefined {
		const signal = this._unwritten.get(name)

		if (!signal) return undefined

		this._unwritten.delete(name)
		this._signals.set(name, signal)

		return signal
	}
}

/** Состояния связок по их прокси — виду двух состояний. */
const shallowStates = new WeakMap<object, TShallowState>()

/** Свойство со значением `undefined` — незаданное: `in` его не видит. */
export function createShallowState(): [
	state: Readonly<Record<string, unknown>>,
	write: (name: string, value: unknown) => void,
] {
	const values = new TShallowState()
	const state = new Proxy<Record<string, unknown>>(
		{},
		{
			get: (_target, key) => values.read(key),
			has: (_target, key) => values.read(key) !== undefined,
		},
	)

	shallowStates.set(state, values)

	return [state, (name, value) => values.write(name, value)]
}

/** Одноимённое свойство берётся из верхнего состояния. */
export type TJoinedState<TBelow extends object, TAbove extends object> = Omit<
	TBelow,
	keyof TAbove
> &
	TAbove

/**
 * Свойство, которого у верхнего состояния связки нет вовсе, читается снизу и
 * сигнала наверху не заводит: фасад строки таблицы не держит сигналов под
 * свойства компонента.
 */
export function joinState<TBelow extends object, TAbove extends object>(
	below: TBelow,
	above: TAbove,
): TJoinedState<TBelow, TAbove> {
	const lines = shallowStates.get(above)
	const joined = new Proxy<object>(
		{},
		{
			get: (_target, key) =>
				(!lines || lines.written(key)) && Reflect.has(above, key)
					? Reflect.get(above, key)
					: Reflect.get(below, key),
		},
	)

	// Связь прокси с именами обоих состояний TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
