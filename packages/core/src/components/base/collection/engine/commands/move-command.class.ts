import type { ICommand, ICommandContext } from './types'
import { TMoveEvent } from '../types'

/**
 * Команда перемещения элемента в коллекции. Старое место команда берёт из
 * состава, а не у вызывающего: место, переданное снаружи, могло оказаться
 * чужим — хранилище переставляло элемент, стоявший там, а событие называло
 * этот.
 *
 * До мутации шлётся `item:move:before` с уже вычисленным `oldIndex`:
 * подписчик может подменить `newIndex` или отменить перемещение через
 * `preventDefault()`. Элементу, которого нет в составе, хук не шлётся.
 *
 * Перемещается элемент только так, как его объявило событие: после хука он
 * стоит на `oldIndex`, а `newIndex` — другое место в составе, целое в
 * `[0, length)`. Иначе это no-op: хранилище не трогаем, `item:moved` не шлём,
 * и `change:items` драйвера тоже не приходит. Так — место за концом,
 * отрицательное и дробное, из вызова и из хука, место, совпавшее со старым, и
 * состав, который хук сдвинул.
 */
export class TMoveCommand<TItem> implements ICommand<TItem> {
	private _event?: TMoveEvent<TItem>
	private _moved = false

	constructor(
		public item: TItem,
		public newIndex: number,
	) {}

	get changed(): boolean {
		return this._moved
	}

	apply(ctx: ICommandContext<TItem>): void {
		const oldIndex = ctx.storage.items.indexOf(this.item)

		if (oldIndex === -1) return

		const event = new TMoveEvent<TItem>(this.item, oldIndex, this.newIndex)
		this._event = event

		ctx.events.emit('item:move:before', event)

		if (event.defaultPrevented) return

		const { items } = ctx.storage
		const { newIndex } = event

		// Хук сдвинул состав: на старом месте другой элемент, а чужой не переставляем
		if (items[oldIndex] !== this.item) return
		if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= items.length) return
		if (newIndex === oldIndex) return

		this._moved = true

		ctx.storage.move(oldIndex, newIndex)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (!this._moved) return

		ctx.events.emit('item:moved', this._event as TMoveEvent<TItem>)
	}
}
