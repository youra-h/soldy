import type { ICommand, ICommandContext } from './types'
import { TInsertEvent } from '../types'

export class TInsertCommand<TItem> implements ICommand<TItem> {
	private _event: TInsertEvent<TItem>

	constructor(
		public item: Partial<TItem>,
		public index: number = 0,
	) {
		this._event = new TInsertEvent<TItem>(this.item)
	}

	apply(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:add:before', this._event)

		if (this._event.defaultPrevented) return

		this.item = this._event.item

		ctx.storage.insert(this.item as TItem, this.index)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:added', this._event)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
