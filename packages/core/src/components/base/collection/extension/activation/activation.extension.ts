import type { IExtension, IExtensionContext, IBaseItemExtensionOptions } from '../types'
import type { TActivationEvents, IActivationExtension } from './types'
import { TActivationItemExtension, type IActivationItemExtension } from './item'
import { TBaseItemExtension } from '../base-item-extension.class'

/**
 * TActivationExtension — расширение для управления активным элементом коллекции.
 *
 * Всегда один активный элемент. При активации нового — предыдущий деактивируется.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TActivationExtension<TItem extends object = any>
	extends TBaseItemExtension<TItem, IActivationItemExtension<TItem>, TActivationEvents<TItem>>
	implements IExtension<TItem>, IActivationExtension<TItem>
{
	readonly name = 'activation' as const

	private _activeItem?: TItem

	constructor(options?: IBaseItemExtensionOptions<TItem, IActivationItemExtension<TItem>>) {
		super(TActivationItemExtension, options)
	}

	get activeItem(): TItem | undefined {
		return this._activeItem
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

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
		if (!this._ctx.engine.includes(item)) return

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
		const fromIndex = fromItem !== undefined ? this._ctx.engine.indexOf(fromItem) : -1

		// Сначала вперёд: fromIndex+1, fromIndex+2, ...
		for (let i = fromIndex + 1; i < this._ctx.engine.length; i++) {
			const item = this._ctx.engine[i]
			if (item && check(item)) return item
		}

		// Затем назад: fromIndex-1, fromIndex-2, ...
		for (let i = fromIndex - 1; i >= 0; i--) {
			const item = this._ctx.engine[i]
			if (item && check(item)) return item
		}

		return undefined
	}
}
