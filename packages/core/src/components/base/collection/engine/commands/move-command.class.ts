import type { ICommand, ICommandContext } from './types'
import { TMoveEvent } from '../types'

/**
 * Команда перемещения элемента в коллекции. Перемещает элемент из старого
 * индекса в новый в хранилище.
 *
 * До мутации шлётся `item:move:before` с уже вычисленным `oldIndex`:
 * подписчик может подменить `newIndex` или отменить перемещение через
 * `preventDefault()`. Если после хука `newIndex` совпал со старым индексом —
 * это no-op: хранилище не трогаем, `item:moved` не шлём.
 */
export class TMoveCommand<TItem> implements ICommand<TItem> {
	private _event?: TMoveEvent<TItem>
	private _moved = false

	constructor(
		public item: TItem,
		public newIndex: number,
		public oldIndex?: number,
	) {}

	get changed(): boolean {
		return this._moved
	}

	apply(ctx: ICommandContext<TItem>): void {
		const oldIdx = this.oldIndex ?? ctx.storage.items.indexOf(this.item)

		if (oldIdx === -1) return

		const event = new TMoveEvent<TItem>(this.item, oldIdx, this.newIndex)
		this._event = event

		ctx.events.emit('item:move:before', event)

		if (event.defaultPrevented) return
		if (event.newIndex === oldIdx) return

		this._moved = true

		ctx.storage.move(oldIdx, event.newIndex)
	}

	emitEvents(ctx: ICommandContext<TItem>): void {
		if (!this._moved) return

		ctx.events.emit('item:moved', this._event as TMoveEvent<TItem>)
	}
}
