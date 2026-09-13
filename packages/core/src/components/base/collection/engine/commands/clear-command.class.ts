import type { ICommand, ICommandContext } from './types'
import { TClearEvent, TRemoveEvent } from '../types'

/**
 * Команда очистки коллекции. Удаляет все элементы из хранилища и сохраняет их
 * снимок для последующего уведомления о событиях.
 *
 * До мутации шлётся один `items:clear:before` на всю операцию, а не по хуку
 * на элемент: отменить удаление части элементов оставило бы коллекцию
 * непустой, а `reset` по смыслу значит «коллекция пуста». После отмены
 * хранилище не трогаем и никаких событий не шлём.
 */
export class TClearCommand<TItem> implements ICommand<TItem> {
	private _event?: TClearEvent<TItem>
	private _cleared = false

	get changed(): boolean {
		return this._cleared
	}

	apply(ctx: ICommandContext<TItem>): void {
		const items = ctx.storage.items

		if (items.length === 0) return

		const event = new TClearEvent<TItem>([...items])
		this._event = event

		ctx.events.emit('items:clear:before', event)

		if (event.defaultPrevented) return

		this._cleared = true

		ctx.storage.clear()
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (!this._cleared) return

		this._event!.items.forEach((item) =>
			ctx.events.emit('item:removed', new TRemoveEvent<TItem>(item)),
		)

		ctx.events.emit('change:count', ctx.storage.items.length)
		ctx.events.emit('reset')
	}
}
