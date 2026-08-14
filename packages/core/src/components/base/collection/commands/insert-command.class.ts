import type { ICommand, ICommandContext } from './types'
import type { TEngineEvents } from '../types'
import { TEvented } from '@soldy/core'

/**
 * Команда вставки элемента в коллекцию. Добавляет элемент в хранилище по указанному индексу и уведомляет о событиях.
 */
export class TInsertCommand<T> implements ICommand<T> {
	constructor(
		public item: T,
		public index: number = 0,
	) {}

	apply(ctx: ICommandContext<T>): void {
		// Синхронный «before»-хук: расширения (item factory) могут подменить элемент.
		const resolved = (ctx.events as TEvented<TEngineEvents<T>>).emitResolve(
			'item:add:before',
			this.item,
		) as T | undefined

		this.item = resolved ?? this.item

		ctx.storage.insert(this.item, this.index)
	}

	emitEvents(ctx: ICommandContext<T>): void {
		ctx.events.emit('item:added', this.item)
		ctx.events.emit('change:count', ctx.storage.items.length)
	}
}
