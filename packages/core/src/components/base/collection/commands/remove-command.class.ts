import type { ICommand, ICommandContext } from './types'

/**
 * Команда удаления элемента из коллекции. Удаляет элемент из хранилища и уведомляет о событиях.
 */
export class TRemoveCommand<TItem> implements ICommand<TItem> {
	constructor(public item: TItem) {}

	apply(ctx: ICommandContext<TItem>): void {
		ctx.storage.remove(this.item)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		ctx.events.emit('item:removed', this.item)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
