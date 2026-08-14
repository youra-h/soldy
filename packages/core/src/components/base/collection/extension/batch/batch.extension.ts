import type { IExtension } from '../types'
import type { TBatchEvents, IBatchExtension } from './types'
import { TInsertCommand, TRemoveCommand, TClearCommand, TUpdateCommand } from '../../commands'
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

	set items(items: TItem[]) {
		this.clear()
		this.set(items)
	}

	get items(): TItem[] {
		return this._ctx.engine
	}

	set(items: TItem[]): void {
		this._ctx.batch(() => {
			items.forEach((item) => this._ctx.execute(new TInsertCommand(item)))
		})

		this.events.emit('items:added', items)
	}

	patch(items: TItem[]): void {
		const trackBy = this._trackBy

		if (!trackBy) {
			throw new Error('trackBy function is not set')
		}

		this._ctx.batch(() => {
			// Сопоставляем ключи существующим элементам
			const itemByKey = new Map<unknown, TItem>()

			this._ctx.engine.forEach((item) => {
				const key = trackBy(item)

				if (key === undefined) {
					throw new Error('patch: trackBy вернул undefined для элемента коллекции')
				}

				if (!itemByKey.has(key)) {
					itemByKey.set(key, item)
				}
			})

			// Какие ключи были найдены в items
			const matchedKeys = new Set<unknown>()

			items.forEach((source) => {
				const key = trackBy(source)

				if (key === undefined) {
					throw new Error('patch: trackBy вернул undefined для source')
				}

				const existing = itemByKey.get(key)

				if (existing) {
					// Обновляем существующий элемент (последний source побеждает)
					this._ctx.execute(new TUpdateCommand(existing, source))
					matchedKeys.add(key)
				} else {
					// Добавляем новый элемент
					this._ctx.execute(new TInsertCommand(source))
				}
			})

			// Удаляем элементы, чьи ключи не были найдены в items
			itemByKey.forEach((item, key) => {
				if (!matchedKeys.has(key)) {
					this._ctx.execute(new TRemoveCommand(item))
				}
			})
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
