import type { ICommand, ICommandContext } from './types'
import { TInsertEvent } from '../types'

/**
 * Команда вставки. Позиция — индекс в хранилище; не задана — в конец.
 *
 * «В конец» команда считает сама, по длине хранилища в момент вставки, а не
 * вызывающий по снимку состава: снимок — копия хранилища, и пачка из N
 * элементов копировала бы его N раз. И длина в момент вставки верна, даже
 * если подписчик `item:add:before` сам вставил или удалил элементы.
 */
export class TInsertCommand<TItem> implements ICommand<TItem> {
	private _event: TInsertEvent<TItem>

	constructor(
		public item: Partial<TItem>,
		public index?: number,
	) {
		this._event = new TInsertEvent<TItem>(this.item)
	}

	get changed(): boolean {
		return !this._event.defaultPrevented
	}

	apply(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:add:before', this._event)

		if (this._event.defaultPrevented) return

		this.item = this._event.item

		ctx.storage.insert(this.item as TItem, this.index ?? ctx.storage.items.length)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (this._event.defaultPrevented) return

		ctx.events.emit('item:added', this._event)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
