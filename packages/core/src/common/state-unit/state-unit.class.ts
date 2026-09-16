import { TEvented } from '../event/evented'
import type { TStateUnitValueEvents, IStateUnit } from './types'
import type { TValuePayload } from '../../common'
import type { TEventSink } from '../event/types'

/**
 * Универсальная единица состояния со значением.
 *
 * Через `resolver` можно задать функцию-преобразователь,
 * которая будет вызываться при чтении `value`.
 * Если резольвер не задан — возвращается хранимое значение как есть.
 *
 * `change` сообщает о смене `value` — разрешённого значения, а не хранимого:
 * подписчик получает то же, что отдаёт геттер, и только когда оно сменилось.
 * Иначе событие расходилось бы с геттером и приходило без реальной смены. Без
 * резольвера это одно и то же. С резольвером запись, не сменившая итог,
 * молчит, хотя `rawValue` обновлён: так своё `disabled = true` у элемента в
 * выключенном списке не шлёт `change:disabled`.
 */
export class TStateUnit<
	TValue,
	TEvents extends TStateUnitValueEvents<TValue> = TStateUnitValueEvents<TValue>,
> implements IStateUnit<TValue, TEvents> {
	public readonly events: TEvented<TEvents>
	protected _value: TValue
	private _resolver?: (value: TValue) => TValue

	constructor({ initial, resolver }: { initial: TValue; resolver?: (value: TValue) => TValue }) {
		this.events = new TEvented<TEvents>()
		this._value = initial
		this._resolver = resolver
	}

	/**
	 * Установить резольвер — функцию, которая преобразует хранимое значение при чтении.
	 * Передайте `undefined` чтобы сбросить.
	 *
	 * Если с новым резольвером сменилось `value`, эмитит `change` с разрешёнными
	 * значениями до и после; иначе молчит.
	 *
	 * @example
	 * state.setResolver((current) => current ?? getDefault() ?? false)
	 */
	setResolver(resolver: ((value: TValue) => TValue) | undefined): void {
		const oldValue = this.value

		this._resolver = resolver

		this._emitIfChanged(oldValue)
	}

	/**
	 * Принудительно оповещает подписчиков, что resolved-значение могло измениться,
	 * даже если хранимое `_value` не менялось.
	 * Полезно когда резольвер зависит от внешних данных, которые изменились без прямой записи в этот state-unit.
	 */
	notify(): void {
		const resolved = this.value
		const payload: TValuePayload<TValue> = { newValue: resolved, oldValue: resolved }

		this._sink.emit('change', payload)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TStateUnitValueEvents<TValue>> {
		return this.events
	}

	get value(): TValue {
		return this._resolver ? this._resolver(this._value) : this._value
	}

	/** Хранимое значение без применения резольвера. */
	get rawValue(): TValue {
		return this._value
	}

	/** Текущий резольвер или undefined, если не задан. */
	get resolver(): ((value: TValue) => TValue) | undefined {
		return this._resolver
	}

	/**
	 * Записать своё значение. `change` — только если сменилось `value`, с
	 * разрешёнными значениями до и после записи.
	 */
	set value(value: TValue) {
		if (this._value === value) return

		const oldValue = this.value

		this._value = value

		this._emitIfChanged(oldValue)
	}

	/** Эмитит `change`, если `value` отличается от разрешённого до операции. */
	private _emitIfChanged(oldValue: TValue): void {
		const newValue = this.value

		if (newValue === oldValue) return

		const payload: TValuePayload<TValue> = { newValue, oldValue }

		this._sink.emit('change', payload)
	}
}
