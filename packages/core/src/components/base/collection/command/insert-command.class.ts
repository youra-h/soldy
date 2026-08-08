import type { IStorage } from '../storage'
import { TEvented } from '@soldy/core'
import type { TEngineEvents } from '../types'
import type { ICommand } from './types'

/**
 * Команда вставки элемента в коллекцию. Добавляет элемент в хранилище по указанному индексу и уведомляет о событиях.
 */
export class TInsertCommand<T> implements ICommand<T> {
	constructor(
		public item: T,
		public index: number = 0,
	) {}

	apply(storage: IStorage<T>): void {
		storage.insert(this.item, this.index)
	}

	emitEvents(events: TEvented<TEngineEvents<T>>, storage: IStorage<T>): void {
		events.emit('item:added', this.item)
		events.emit('change:count', storage.items.length)
	}
}
