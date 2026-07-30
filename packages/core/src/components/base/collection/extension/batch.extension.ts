import type { IExtension, IExtensionContext } from './types'
import { TInsertCommand, TRemoveCommand, TClearCommand } from '../command'

/**
 * BatchExtension — расширение для пакетного добавления и удаления элементов из коллекции
 */
export class TBatchExtension<T> implements IExtension<T> {
	readonly name = 'batch'

	private ctx!: IExtensionContext<T>

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx
	}

	add(items: T[]): void {
		this.ctx.batch(() => {
			items.forEach((item) => this.ctx.execute(new TInsertCommand(item)))
		})

		this.ctx.engine.events.emit('items:added', items)
	}

	remove(items: T[]): void {
		this.ctx.batch(() => {
			items.forEach((item) => this.ctx.execute(new TRemoveCommand(item)))
		})

		this.ctx.engine.events.emit('items:removed', items)
	}

	clear(): void {
		this.ctx.execute(new TClearCommand())
		this.ctx.engine.events.emit('items:removed', [])
	}
}
