import type { IExtension, IExtensionContext } from '../types'
import type { TActivationEvents } from './types'
import { TEvented } from '@soldy/core'

/**
 * TActivationExtension — расширение для управления активным элементом коллекции.
 *
 * Всегда один активный элемент. При активации нового — предыдущий деактивируется.
 */
export class TActivationExtension<T> implements IExtension<T> {
	readonly name = 'activation'
	readonly events = new TEvented<TActivationEvents<T>>()

	private ctx!: IExtensionContext<T>
	private _activeItem?: T

	get activeItem(): T | undefined {
		return this._activeItem
	}

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx

		ctx.engine.events.on('item:removed', (item: T) => {
			if (this._activeItem === item) {
				this.reset()
			}
		})

		ctx.engine.events.on('reset', () => {
			this.reset()
		})
	}

	/**
	 * Установить активный элемент.
	 * Если элемент уже активен — ничего не делает.
	 * Предыдущий активный элемент деактивируется автоматически.
	 */
	activate(item: T): void {
		if (this._activeItem === item) return
		if (!this.ctx.engine.includes(item)) return

		const prev = this._activeItem

		this._activeItem = item

		this.events.emit('item:activated', item)
		this.events.emit('change:activation', item)
	}

	/**
	 * Деактивировать элемент.
	 * Если элемент не является активным — ничего не делает.
	 */
	deactivate(item: T): void {
		if (this._activeItem !== item) return

		this._activeItem = undefined

		this.events.emit('item:deactivated', undefined)
		this.events.emit('change:activation', undefined)
	}

	/**
	 * Переключить активность элемента.
	 * Если элемент активен — деактивирует, иначе — активирует.
	 */
	toggle(item: T): void {
		if (this._activeItem === item) {
			this.deactivate(item)
		} else {
			this.activate(item)
		}
	}

	/**
	 * Проверить, активен ли элемент.
	 */
	isActive(item: T): boolean {
		return this._activeItem === item
	}

	/**
	 * Сбросить активный элемент.
	 */
	reset(): void {
		if (this._activeItem) {
			const prev = this._activeItem

			this._activeItem = undefined

			this.events.emit('item:deactivated', undefined)
			this.events.emit('change:activation', undefined)
		}
	}

	/**
	 * Найти следующий подходящий элемент для активации.
	 * Поиск: сначала вперёд от fromItem, затем назад.
	 *
	 * @param predicate Условие отбора (опционально)
	 * @param fromItem  Элемент-ориентир для поиска (опционально)
	 */
	findActivatable(predicate?: (item: T) => boolean, fromItem?: T): T | undefined {
		const check = predicate ?? (() => true)
		const fromIndex = fromItem !== undefined ? this.ctx.engine.indexOf(fromItem) : -1

		// Сначала вперёд: fromIndex+1, fromIndex+2, ...
		for (let i = fromIndex + 1; i < this.ctx.engine.length; i++) {
			const item = this.ctx.engine[i]
			if (item && check(item)) return item
		}

		// Затем назад: fromIndex-1, fromIndex-2, ...
		for (let i = fromIndex - 1; i >= 0; i--) {
			const item = this.ctx.engine[i]
			if (item && check(item)) return item
		}

		return undefined
	}
}
