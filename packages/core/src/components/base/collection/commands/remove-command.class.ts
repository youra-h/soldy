import type { ICommand, ICommandContext } from './types'

/**
 * Команда удаления элемента из коллекции. Удаляет элемент из хранилища и уведомляет о событиях.
 */
export class TRemoveCommand<T> implements ICommand<T> {
	constructor(public item: T) {}

	apply(ctx: ICommandContext<T>): void {
		ctx.storage.remove(this.item)
	}

	emitEvents(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:removed', this.item)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
