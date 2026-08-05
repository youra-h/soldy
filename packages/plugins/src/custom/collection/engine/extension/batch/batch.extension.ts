import type { IExtension, IExtensionContext } from '../types'
import type { TBatchEvents } from './types'
import { TInsertCommand, TRemoveCommand, TClearCommand } from '../../command'
import { TEvented } from '@soldy/core'

/**
 * TBatchExtension — расширение для пакетных операций
 */
export class TBatchExtension<T> implements IExtension<T> {
	readonly name = 'batch'
	readonly events = new TEvented<TBatchEvents<T>>()

	private ctx!: IExtensionContext<T>

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx
	}

	add(items: T[]): void {
		this.ctx.batch(() => {
			items.forEach((item) => this.ctx.execute(new TInsertCommand(item)))
		})

		this.events.emit('items:added', items)
	}

	remove(items: T[]): void {
		this.ctx.batch(() => {
			items.forEach((item) => this.ctx.execute(new TRemoveCommand(item)))
		})

		this.events.emit('items:removed', items)
	}

	clear(): void {
		this.ctx.execute(new TClearCommand())
		this.events.emit('items:removed', [])
	}
}
