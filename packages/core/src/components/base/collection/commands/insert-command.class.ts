import type { ICommand, ICommandContext } from './types'
import { TInsertEvent } from '../types'

export class TInsertCommand<T> implements ICommand<T> {
	private _event: TInsertEvent<T>

	constructor(
		public item: T,
		public index: number = 0,
	) {
		this._event = new TInsertEvent<T>(this.item)
	}

	apply(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:add:before', this._event)

		if (this._event.defaultPrevented) return

		this.item = this._event.item

		ctx.storage.insert(this.item, this.index)
	}

	emitEvents(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:added', this._event)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
