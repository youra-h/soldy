import { TEvented } from '../event/evented'
import type { TValuePayload } from '../../common'

/**
 * Правило «то же самое»: равное значение не пишется и `change` не шлёт.
 *
 * По умолчанию `===` — его хватает числам, строкам и булевым. Составному
 * значению нужно своё: массив, собранный заново с тем же составом, по ссылке
 * другой, и без правила каждая запись того же списка слала бы `change`, а
 * резольвер, отдающий новый массив на каждое чтение, — на каждой проверке.
 * Слой setup держит то же правило у своих ячеек (`TCell`).
 */
export type TSameValue<TValue> = (a: TValue, b: TValue) => boolean

/** Опции единицы состояния. */
export type TStateUnitOptions<TValue> = {
	/** Начальное хранимое значение */
	initial: TValue
	/** Преобразование хранимого значения при чтении */
	resolver?: (value: TValue) => TValue
	/** Правило «то же самое» — и для записи, и для итога перед `change`. По умолчанию `===` */
	same?: TSameValue<TValue>
}

export type TStateUnitValueEvents<TValue> = {
	/**
	 * Сменилось `value` — разрешённое значение. `newValue`/`oldValue` тоже
	 * разрешённые; `notify(oldValue)` шлёт ту же пару и молчит, когда итог не
	 * сменился.
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
	 * Оповестить подписчиков, что итог мог смениться из-за внешних данных
	 * резольвера. `oldValue` — итог до их смены: подписчику нужна настоящая
	 * пара «было/стало», а совпадение с текущим значит, что менять нечего, — и
	 * события не будет.
	 */
	notify(oldValue: TValue): void
}
