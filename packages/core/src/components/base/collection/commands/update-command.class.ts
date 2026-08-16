import type { ICommand, ICommandContext } from './types'

/**
 * Команда обновления элемента в коллекции. Обновляет свойства элемента в хранилище и уведомляет о событиях.
 */
export class TUpdateCommand<TItem> implements ICommand<TItem> {
	constructor(
		public item: TItem,
		public changes: Partial<TItem>,
	) {}

	apply(ctx: ICommandContext<TItem>): void {
		Object.assign(this.item as object, this.changes)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:updated', this.item, this.changes)
	}
}
