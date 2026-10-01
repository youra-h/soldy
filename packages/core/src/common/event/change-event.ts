import { TActionEvent } from './action-event'

/**
 * Запись свойства, которую ещё можно поправить или отменить, —
 * аргумент `change:<x>:before`.
 *
 * Так расширяют свойство снаружи: подписчик подменяет `value` (нормализация,
 * ограничение) или отменяет запись `preventDefault()`. Тот же приём, что у
 * `show:before`, операций коллекции (`item:add:before`) и запроса закрытия
 * (`close:before`).
 */
export class TChangeEvent<TValue> extends TActionEvent {
	/** Значение к записи: подписчик вправе его заменить. */
	public value: TValue
	/** Значение свойства до записи. */
	public readonly oldValue: TValue

	constructor(value: TValue, oldValue: TValue) {
		super()

		this.value = value
		this.oldValue = oldValue
	}
}
