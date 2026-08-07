import type { IExtension, IExtensionContext } from '../types'
import type { TActivationEvents } from './types'
import { TActivationItemExtension } from './item'
import { TEvented } from '@soldy/core'
import type { TConstructor } from '@soldy/core'

/**
 * TActivationExtension — расширение для управления активным элементом коллекции.
 *
 * Всегда один активный элемент. При активации нового — предыдущий деактивируется.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TActivationExtension<TItem extends object = any> implements IExtension<TItem> {
	readonly name = 'activation'
	readonly events = new TEvented<TActivationEvents<TItem>>()

	private ctx!: IExtensionContext<TItem>
	private _activeItem?: TItem
	private readonly _itemCtor?: TConstructor<TItem>

	constructor(options?: { itemCtor?: TConstructor<TItem> }) {
		this._itemCtor = options?.itemCtor
	}

	/** Создаёт stateless-делегат для конкретного элемента */
	createItem(owner: TItem): TActivationItemExtension<TItem> {
		return new TActivationItemExtension(owner, this)
	}

	get activeItem(): TItem | undefined {
		return this._activeItem
	}

	install(ctx: IExtensionContext<TItem>): void {
		this.ctx = ctx

		ctx.engine.events.on('item:removed', (item: TItem) => {
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
	activate(item: TItem): void {
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
	deactivate(item: TItem): void {
		if (this._activeItem !== item) return

		this._activeItem = undefined

		this.events.emit('item:deactivated', undefined)
		this.events.emit('change:activation', undefined)
	}

	/**
	 * Переключить активность элемента.
	 * Если элемент активен — деактивирует, иначе — активирует.
	 */
	toggle(item: TItem): void {
		if (this._activeItem === item) {
			this.deactivate(item)
		} else {
			this.activate(item)
		}
	}

	/**
	 * Проверить, активен ли элемент.
	 */
	isActive(item: TItem): boolean {
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
	findActivatable(predicate?: (item: TItem) => boolean, fromItem?: TItem): TItem | undefined {
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
