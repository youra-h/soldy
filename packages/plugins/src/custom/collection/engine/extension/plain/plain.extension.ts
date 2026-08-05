import type { IExtension, IExtensionContext } from '../types'
import { TInsertCommand, TRemoveCommand, TUpdateCommand, TMoveCommand } from '../../command'

/**
 * TPlainExtension — расширение для базовых операций с коллекцией
 */
export class TPlainExtension<T> implements IExtension<T> {
	readonly name = 'plain'

	private ctx!: IExtensionContext<T>

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx
	}

	insert(item: T, index: number = 0): void {
		this.ctx.execute(new TInsertCommand(item, index))
	}

	remove(item: T): void {
		this.ctx.execute(new TRemoveCommand(item))
	}

	update(item: T, changes: Partial<T>): void {
		this.ctx.execute(new TUpdateCommand(item, changes))
	}

	move(item: T, newIndex: number, oldIndex?: number): void {
		this.ctx.execute(new TMoveCommand(item, newIndex, oldIndex))
	}

	getAll(): T[] {
		return [...this.ctx.engine]
	}

	find(predicate: (item: T) => boolean): T | undefined {
		return this.ctx.engine.find(predicate)
	}

	filter(predicate: (item: T) => boolean): T[] {
		return this.ctx.engine.filter(predicate)
	}

	get(index: number): T | undefined {
		return this.ctx.engine[index]
	}

	get length(): number {
		return this.ctx.engine.length
	}
}
