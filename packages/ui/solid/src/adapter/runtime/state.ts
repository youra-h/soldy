/**
 * The binding's state and the view of two states. AGENTS.md (Solid), «Связка».
 *
 * - The state is a signal per property, and a value is handed over as it is:
 *   the core hands out values, and a changed one comes as a new object
 *   (AGENTS.md, «Контракт границы core → ui»). Solid's store wrapped every
 *   nested object — a row's cells, their `aria` and `dataset` — in a proxy
 *   with a signal per read property that never changes. Like `shallowRef` in
 *   Vue.
 * - A signal is made by the first read of a property: the markup reads less
 *   than half of the binding's properties, and the subscription hands over the
 *   value of each.
 * - Writes of an update of the exchange are applied at its end, in one
 *   `batch` (`IUpdateListener`): Solid renders on a signal write, and a write
 *   applied in the middle of the update rendered before the update's event
 *   reached the consumer — the panel opened by `change:open` mounted, and its
 *   items joined the menu first. A read in the middle of the update sees the
 *   written value already: only the signal's notification waits.
 * - The view of two contexts is a proxy that reads a property from the state
 *   on every read: a spread would read it once, in the component's body, and
 *   getters by keys would lose the properties not set by the assembly. The
 *   component and the facade have no properties of the same name — the
 *   facade's names are prefixed.
 */

import { batch, createSignal, type Accessor, type Setter } from 'solid-js'
import type { IUpdateListener } from '@soldy-ui/setup'

type TSignal = [Accessor<unknown>, Setter<unknown>]

/** Значения и сигналы свойств — за прокси состояния. */
class TShallowState implements IUpdateListener {
	/** Записанные, но ещё не прочитанные — без сигнала. */
	private readonly _values = new Map<PropertyKey, unknown>()
	/** Прочитанные записанные. */
	private readonly _signals = new Map<PropertyKey, TSignal>()
	/** Прочитанные до записи: подписка связки отдаёт каждое свойство сразу, и здесь — чужие. */
	private readonly _unwritten = new Map<PropertyKey, TSignal>()
	/** Writes of the update in progress — applied at its end. */
	private _pending?: Map<PropertyKey, unknown>
	/** Updates of the exchange in progress: a sink's write to a participant nests one. */
	private _depth = 0

	/** The property was written: for the binding, one of its properties, from the subscription. */
	written(key: PropertyKey): boolean {
		return this._values.has(key) || this._signals.has(key) || this._pending?.has(key) === true
	}

	read(key: PropertyKey): unknown {
		const value = this._signalOf(key)[0]()
		const pending = this._pending

		return pending?.has(key) ? pending.get(key) : value
	}

	write(name: PropertyKey, value: unknown): void {
		if (this._depth > 0) (this._pending ??= new Map()).set(name, value)
		else this._apply(name, value)
	}

	begin(): void {
		this._depth++
	}

	/** The outermost update ended: its writes go to the signals, and Solid renders once. */
	end(): void {
		// The listener may have come in the middle of an update and missed its beginning
		if (this._depth === 0 || --this._depth > 0) return

		const pending = this._pending

		if (pending === undefined) return

		this._pending = undefined
		batch(() => pending.forEach((value, name) => this._apply(name, value)))
	}

	private _apply(name: PropertyKey, value: unknown): void {
		const signal = this._signals.get(name) ?? this._adopt(name)

		// A setter of a signal would take a function value for an updater
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

/**
 * A property with the value `undefined` is unset: `in` does not see it. The
 * listener of the exchange's updates holds the writes of an update back to
 * its end.
 */
export function createShallowState(): [
	state: Readonly<Record<string, unknown>>,
	write: (name: string, value: unknown) => void,
	updates: IUpdateListener,
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

	return [state, (name, value) => values.write(name, value), values]
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
