import type { ICommand, ICommandContext } from './types'

/**
 * Команда перемещения элемента в коллекции. Перемещает элемент из старого индекса в новый индекс в хранилище.
 */
export class TMoveCommand<TItem> implements ICommand<TItem> {
	private _resolvedOldIndex: number = -1

	constructor(
		public item: TItem,
		public newIndex: number,
		public oldIndex?: number,
	) {}

	apply(ctx: ICommandContext<TItem>): void {
		const oldIdx = this.oldIndex ?? ctx.storage.items.indexOf(this.item)

		if (oldIdx === -1 || oldIdx === this.newIndex) return

		this._resolvedOldIndex = oldIdx
		ctx.storage.move(oldIdx, this.newIndex)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (this._resolvedOldIndex !== -1) {
			ctx.events.emit('item:moved', this.item, this._resolvedOldIndex, this.newIndex)
		}
	}
}
