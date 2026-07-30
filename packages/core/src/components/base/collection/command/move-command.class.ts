import type { IStorage } from '../storage'
import type { TEvented } from '../../../../common/event'
import type { TEngineEvents } from '../types'
import type { ICommand } from './types'

/**
 * Команда перемещения элемента в коллекции. Перемещает элемент из старого индекса в новый индекс в хранилище.
 */
export class TMoveCommand<T> implements ICommand<T> {
	private _resolvedOldIndex: number = -1

	constructor(
		public item: T,
		public newIndex: number,
		public oldIndex?: number,
	) {}

	apply(storage: IStorage<T>): void {
		const oldIdx = this.oldIndex ?? storage.items.indexOf(this.item)

		if (oldIdx === -1 || oldIdx === this.newIndex) return

		this._resolvedOldIndex = oldIdx
		storage.move(oldIdx, this.newIndex)
	}

	emitEvents(events: TEvented<TEngineEvents<T>>): void {
		if (this._resolvedOldIndex !== -1) {
			events.emit('item:moved', this.item, this._resolvedOldIndex, this.newIndex)
		}
	}
}
