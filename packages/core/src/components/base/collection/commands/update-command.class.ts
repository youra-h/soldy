import type { ICommand, ICommandContext } from './types'
import { TUpdateEvent } from '../types'

/**
 * Команда обновления элемента в коллекции.
 * Обновляет свойства элемента в хранилище и уведомляет о событиях через TUpdateEvent.
 */
export class TUpdateCommand<TItem> implements ICommand<TItem> {
	private _event: TUpdateEvent<TItem>

	constructor(
		public item: TItem,
		public changes: Partial<TItem>,
	) {
		this._event = new TUpdateEvent<TItem>(this.item, this.changes)
	}

	apply(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:update:before', this._event)

		if (this._event.defaultPrevented) return

		this.item = this._event.item
		this.changes = this._event.changes

		Object.assign(this.item as object, this.changes)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:updated', this._event)
	}
}
