import type { ICommand, ICommandContext } from './types'

/**
 * Команда обновления элемента в коллекции. Обновляет свойства элемента в хранилище и уведомляет о событиях.
 */
export class TUpdateCommand<T> implements ICommand<T> {
	constructor(
		public item: T,
		public changes: Partial<T>,
	) {}

	apply(ctx: ICommandContext<T>): void {
		Object.assign(this.item as object, this.changes)
	}

	emitEvents(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:updated', this.item, this.changes)
	}
}
