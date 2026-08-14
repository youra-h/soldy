import type { ICommand, ICommandContext } from './types'

/**
 * Команда очистки коллекции. Удаляет все элементы из хранилища и сохраняет их для последующего уведомления о событиях.
 */
export class TClearCommand<T> implements ICommand<T> {
	private _removedItems: T[] = []

	apply(ctx: ICommandContext<T>): void {
		this._removedItems = [...ctx.storage.items]
		ctx.storage.clear()
	}

	emitEvents(ctx: ICommandContext<T>): void {
		this._removedItems.forEach((item) => ctx.events.emit('item:removed', item))

		ctx.events.emit('change:count', ctx.storage.items.length)
		ctx.events.emit('reset')
	}
}
