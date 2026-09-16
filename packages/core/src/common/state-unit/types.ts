import { TEvented } from '../event/evented'
import type { TValuePayload } from '../../common'

export type TStateUnitValueEvents<TValue> = {
	/**
	 * Сменилось `value` — разрешённое значение. `newValue`/`oldValue` тоже
	 * разрешённые; `notify()` шлёт оба равными текущему.
	 */
	change: (payload: TValuePayload<TValue>) => void
}

/**
 * Контракт value-based state.
 * Все state-units имеют `value`, `rawValue`, `resolver` и событие `change`.
 *
 * `change` сообщает о `value`, а не о `rawValue`: приходит, только когда
 * сменилось значение после резольвера, и несёт его же. Запись, которая итога
 * не сменила, молчит — `rawValue` при этом обновлён.
 */
export interface IStateUnit<
	TValue,
	TEvents extends TStateUnitValueEvents<TValue> = TStateUnitValueEvents<TValue>,
> {
	/** Значение после применения резольвера (если задан). */
	value: TValue
	/** Хранимое значение без резольвера. */
	readonly rawValue: TValue
	/** Текущий резольвер или undefined. */
	readonly resolver: ((value: TValue) => TValue) | undefined
	readonly events: TEvented<TEvents>
	/**
	 * Установить резольвер — функцию, которая преобразует хранимое значение при чтении.
	 * Передайте `undefined` чтобы сбросить.
	 *
	 * Эмитит `change`, только если с новым резольвером сменилось `value`.
	 */
	setResolver(resolver: ((value: TValue) => TValue) | undefined): void
	/**
	 * Принудительно оповещает подписчиков, что resolved-значение могло измениться.
	 */
	notify(): void
}
