import type { IExtension } from '../types'
import { TInsertCommand, TRemoveCommand, TUpdateCommand, TMoveCommand } from '../../command'
import { TBaseExtension } from '../base-extension.class'

/**
 * TPlainExtension — расширение для базовых операций с коллекцией
 */
export class TPlainExtension<TItem extends object> extends TBaseExtension<TItem, {}> implements IExtension<TItem> {
	readonly name = 'plain' as const
	insert(item: TItem, index: number = 0): void {
		this._ctx.execute(new TInsertCommand(item, index))
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
