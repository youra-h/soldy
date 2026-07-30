import type { IStorage } from '../storage'
import type { TEvented } from '../../../../common/event'
import type { TEngineEvents } from '../types'
import type { ICommand } from './types'

/**
 * Команда удаления элемента из коллекции. Удаляет элемент из хранилища и уведомляет о событиях.
 */
export class TRemoveCommand<T> implements ICommand<T> {
	constructor(public item: T) {}

	apply(storage: IStorage<T>): void {
		storage.remove(this.item)
	}

	emitEvents(events: TEvented<TEngineEvents<T>>, storage: IStorage<T>): void {
		events.emit('item:removed', this.item)
		events.emit('change:count', storage.items.length)
	}
}
