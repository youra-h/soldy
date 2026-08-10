import type { IExtension } from '../types'
import type { TBatchEvents } from './types'
import { TInsertCommand, TRemoveCommand, TClearCommand } from '../../command'
import { TBaseExtension } from '../base-extension.class'

/**
 * TBatchExtension — расширение для пакетных операций
 */
export class TBatchExtension<TItem extends object>
	extends TBaseExtension<TItem, TBatchEvents<TItem>>
	implements IExtension<TItem>
{
	readonly name = 'batch' as const

	add(items: TItem[]): void {
		this._ctx.batch(() => {
			items.forEach((item) => this._ctx.execute(new TInsertCommand(item)))
		})

		this.events.emit('items:added', items)
	}

	remove(items: TItem[]): void {
		this._ctx.batch(() => {
			items.forEach((item) => this._ctx.execute(new TRemoveCommand(item)))
		})

		this.events.emit('items:removed', items)
	}

	clear(): void {
		this._ctx.execute(new TClearCommand())
		this.events.emit('items:removed', [])
	}
}
