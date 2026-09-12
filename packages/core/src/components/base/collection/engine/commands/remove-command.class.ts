import type { ICommand, ICommandContext } from './types'

/**
 * Команда удаления элемента из коллекции.
 *
 * Идемпотентна целиком, а не только по данным: `storage.remove` и раньше
 * молча пропускал отсутствующий элемент, но уведомление уходило всё равно —
 * и подписчики (`selection`, реестр контекстов, bundles) реагировали на
 * удаление, которого не было. Теперь `item:removed` шлётся, только если
 * элемент действительно лежал в хранилище.
 *
 * Это не теоретический случай: закрытие таба удаляет его из коллекции, следом
 * UI размонтирует компонент — и удаление приходило вторым заходом.
 */
export class TRemoveCommand<TItem> implements ICommand<TItem> {
	private _removed = false

	constructor(public item: TItem) {}

	apply(ctx: ICommandContext<TItem>): void {
		this._removed = ctx.storage.items.includes(this.item)

		if (!this._removed) return

		ctx.storage.remove(this.item)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (!this._removed) return

		ctx.events.emit('item:removed', this.item)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
