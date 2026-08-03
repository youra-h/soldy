import type { IStorage } from '../storage'
import { TEvented } from '@soldy/core'
import type { TEngineEvents } from '../types'
import type { ICommand } from './types'

/**
 * Команда очистки коллекции. Удаляет все элементы из хранилища и сохраняет их для последующего уведомления о событиях.
 */
export class TClearCommand<T> implements ICommand<T> {
	private _removedItems: T[] = []

	apply(storage: IStorage<T>): void {
		this._removedItems = [...storage.items]
		storage.clear()
	}

	emitEvents(events: TEvented<TEngineEvents<T>>, storage: IStorage<T>): void {
		this._removedItems.forEach((item) => events.emit('item:removed', item))

		events.emit('change:count', storage.items.length)
		events.emit('reset')
	}
}
