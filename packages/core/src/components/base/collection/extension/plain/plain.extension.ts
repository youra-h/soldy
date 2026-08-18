import type { IExtension, IExtensionContext } from '../types'
import { TInsertCommand, TRemoveCommand, TUpdateCommand, TMoveCommand } from '../../commands'
import { TBaseExtension } from '../base-extension.class'
import type { TPlainEvents } from './types'

/**
 * TPlainExtension — расширение для базовых операций с коллекцией
 */
export class TPlainExtension<TItem extends object>
	extends TBaseExtension<TItem, TPlainEvents<TItem>>
	implements IExtension<TItem>
{
	readonly name = 'plain' as const

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.engine.events.relay(this.events, [
			'item:add:before',
			'item:added',
			'item:removed',
			'item:updated',
			'item:moved',
			'change:items',
			'change:count',
			'reset',
		])
	}

	/**
	 * Вставить элемент в коллекцию. Либо вставлять в начало по умолчанию, либо в конец через push().
	 * @param item
	 * @param index
	 */
	insert(item: Partial<TItem>, index: number = 0): TItem {
		const command = new TInsertCommand(item, index)

		this._ctx.execute(command)

		return command.item as TItem
	}

	/**
	 * Вставить элемент в конец коллекции.
	 * @param item
	 */
	push(item: Partial<TItem>): TItem {
		return this.insert(item, this._ctx.engine.length)
	}

	remove(item: TItem): void {
		this._ctx.execute(new TRemoveCommand(item))
	}

	update(item: TItem, changes: Partial<TItem>): void {
		this._ctx.execute(new TUpdateCommand(item, changes))
	}

	move(item: TItem, newIndex: number, oldIndex?: number): void {
		this._ctx.execute(new TMoveCommand(item, newIndex, oldIndex))
	}

	getAll(): TItem[] {
		return [...this._ctx.engine]
	}

	find(predicate: (item: TItem) => boolean): TItem | undefined {
		return this._ctx.engine.find(predicate)
	}

	filter(predicate: (item: TItem) => boolean): TItem[] {
		return this._ctx.engine.filter(predicate)
	}

	get(index: number): TItem | undefined {
		return this._ctx.engine[index]
	}

	get length(): number {
		return this._ctx.engine.length
	}
}
