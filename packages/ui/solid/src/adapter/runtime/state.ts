/**
 * Состояние связки и вид двух состояний. AGENTS.md (Solid), «Связка».
 *
 * - Состояние — сигнал на свойство, значение отдаётся как есть: ядро отдаёт
 *   значения, и сменившееся приходит новым объектом (AGENTS.md, «Контракт
 *   границы core → ui»). Стор Solid оборачивал каждый вложенный объект —
 *   ячейки строки, их `aria` и `dataset` — в прокси с сигналом на прочитанное
 *   свойство, которое никогда не сменится. Как `shallowRef` у Vue.
 * - Вид двух контекстов — прокси, которое читает свойство у состояния на
 *   каждое чтение: спред прочёл бы его один раз, в теле компонента, а геттеры
 *   по ключам потеряли бы свойства, незаданные к сборке. Одноимённых у
 *   компонента и фасада нет — имена фасада префиксуются.
 */

import { createSignal, type Accessor, type Setter } from 'solid-js'

/** Свойство со значением `undefined` — незаданное: `in` его не видит. */
export function createShallowState(): [
	state: Readonly<Record<string, unknown>>,
	write: (name: string, value: unknown) => void,
] {
	const signals = new Map<PropertyKey, [Accessor<unknown>, Setter<unknown>]>()
	const signalOf = (key: PropertyKey): [Accessor<unknown>, Setter<unknown>] => {
		let signal = signals.get(key)

		if (!signal)
			signals.set(key, (signal = createSignal<unknown>(undefined, { internal: true })))

		return signal
	}
	const state = new Proxy<Record<string, unknown>>(
		{},
		{
			get: (_target, key) => signalOf(key)[0](),
			has: (_target, key) => signalOf(key)[0]() !== undefined,
		},
	)

	// Значение-функцию сеттер сигнала счёл бы updater'ом
	return [state, (name, value) => signalOf(name)[1](() => value)]
}

/** Одноимённое свойство берётся из верхнего состояния. */
export type TJoinedState<TBelow extends object, TAbove extends object> = Omit<
	TBelow,
	keyof TAbove
> &
	TAbove

export function joinState<TBelow extends object, TAbove extends object>(
	below: TBelow,
	above: TAbove,
): TJoinedState<TBelow, TAbove> {
	const joined = new Proxy<object>(
		{},
		{
			get: (_target, key) =>
				Reflect.has(above, key) ? Reflect.get(above, key) : Reflect.get(below, key),
		},
	)

	// Связь прокси с именами обоих состояний TypeScript не видит
	return joined as TJoinedState<TBelow, TAbove>
}
