import type { ICommand, ICommandContext } from './types'
import { TInsertEvent } from '../types'

export class TInsertCommand<T> implements ICommand<T> {
	constructor(
		public item: T,
		public index: number = 0,
	) {}

	apply(ctx: ICommandContext<T>): void {
		const e = new TInsertEvent(this.item)
		ctx.events.emit('item:add:before', e)

		if (e.defaultPrevented) return

		this.item = e.item

		ctx.storage.insert(this.item, this.index)
	}

	emitEvents(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:added', this.item)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
