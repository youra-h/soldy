import type { IExtension } from '../types'
import type { TBatchEvents, IBatchExtension } from './types'
import { TInsertCommand, TRemoveCommand, TClearCommand } from '../../commands'
import { TBaseExtension } from '../base-extension.class'

/**
 * TBatchExtension — расширение для пакетных операций
 */
export class TBatchExtension<TItem extends object>
	extends TBaseExtension<TItem, TBatchEvents<TItem>>
	implements IExtension<TItem>, IBatchExtension<TItem>
{
	readonly name = 'batch' as const

	private _trackBy: (item: TItem) => any = (item) => item

	get trackBy(): (item: TItem) => any {
		return this._trackBy
	}

	set trackBy(fn: (item: TItem) => any) {
		if (this._trackBy === fn) return

		this._trackBy = fn

		this.events.emit('change:trackBy', fn)
	}

	set(items: TItem[]): void {
		this._ctx.batch(() => {
			items.forEach((item) => this._ctx.execute(new TInsertCommand(item)))
		})

		this.events.emit('items:added', items)
	}

	patch(items: TItem[]): void {
		if (!this._trackBy) {
			throw new Error('trackBy function is not set')
		}

		// this._ctx.batch(() => {
		// 	items.forEach((item) => this._ctx.execute(new TInsertCommand(item)))
		// })

		this.events.emit('items:added', items)
	}

	clear(): void {
		this._ctx.execute(new TClearCommand())
		this.events.emit('items:removed', [])
	}
}
