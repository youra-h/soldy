import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TActivationEvents, IActivationExtension } from './types'
import { TActivationItemExtension, type IActivationItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'
import type { TMetaExtension } from '../meta'
import type { TDataset } from '../../../../../../common'

/**
 * TActivationExtension — расширение для управления активным элементом коллекции.
 *
 * Всегда один активный элемент. При активации нового — предыдущий деактивируется.
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TActivationExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<
		TItem,
		IActivationItemExtension<TItem>,
		TActivationEvents<TItem>
	>
	implements IExtension<TItem>, IActivationExtension<TItem>
{
	readonly name = 'activation' as const

	private _activeItem?: TItem

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, IActivationItemExtension<TItem>>) {
		super(TActivationItemExtension, options)
	}

	get activeItem(): TItem | undefined {
		return this._activeItem
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		this.events.on('change:activation', () => this._syncDataset())
		ctx.driver.events.on('item:added', () => this._syncDataset())
		ctx.driver.events.on('change:items', () => this._syncDataset())
		this._syncDataset()

		ctx.driver.events.on('item:removed', (item: TItem) => {
			if (this._activeItem === item) {
				this.reset()
			}
		})

		ctx.driver.events.on('reset', () => {
			this.reset()
		})

		const meta = ctx.extensions.meta as TMetaExtension<TItem> | undefined

		if (meta) {
			const applyMeta = (item: TItem, m: Record<string, unknown>) => {
				if (!m.active) return

				this.activate(item)
			}

			meta.events.on('meta:applied', applyMeta)
			meta.events.on('meta:changed', applyMeta)

			// Догон: расширение могло прийти в уже наполненную коллекцию, и свои
			// `meta:applied` оно тогда пропустило. Снимок помнит `meta`
			ctx.driver.forEach((item) => {
				const remembered = meta.get?.(item)

				if (remembered) applyMeta(item, remembered)
			})
		}

		ctx.driver.events.on('item:removed', (item: TItem) => {
			if (this._activeItem === item) {
				this.reset()
			}

			const next = this.findActivatable(undefined, item)

			if (next) {
				this.activate(next)
			}
		})
	}

	/**
	 * Установить активный элемент.
	 * Если элемент уже активен — ничего не делает.
	 * Предыдущий активный элемент деактивируется автоматически.
	 */
	activate(item: TItem): void {
		const canonical = this._canonical(item)

		if (this._activeItem === canonical) return

		if (!this._ctx.driver.includes(canonical)) return

		this._activeItem = canonical

		this.events.emit('item:activated', canonical)
		this.events.emit('change:activation', canonical)
	}

	/**
	 * Разрешить элемент, пришедший снаружи (из UI), до исходного из storage.
	 * См. тот же хелпер в `TSelectionExtension`.
	 */
	private _canonical(item: TItem): TItem {
		return this._ctx?.driver.canonical(item) ?? item
	}

	/**
	 * Деактивировать элемент.
	 * Если элемент не является активным — ничего не делает.
	 */
	deactivate(item: TItem): void {
		if (this._activeItem !== item) return

		this._activeItem = undefined

		this.events.emit('item:deactivated', item)
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
	 * Зеркалит активность в `data-selected` элементов — как это делает
	 * `TSelectionExtension` для выбора.
	 *
	 * Имя атрибута то же, хотя состояние называется иначе, и это осознанно:
	 * `data-*` — контракт с темой, а тема красит «выделенный элемент»
	 * одинаково, будь он активным табом, раскрытой секцией или выбранной
	 * опцией. Расходится только ARIA, и она остаётся за расширением
	 * конкретного компонента.
	 */
	private _syncDataset(): void {
		this._ctx?.driver.forEach((item: TItem) => {
			;(item as { dataset?: TDataset }).dataset?.add('selected', this.isActive(item))
		})
	}

	/**
	 * Сбросить активный элемент.
	 */
	reset(): void {
		if (this._activeItem) {
			const prev = this._activeItem

			this._activeItem = undefined

			this.events.emit('item:deactivated', prev)
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
		const fromIndex = fromItem !== undefined ? this._ctx.driver.indexOf(fromItem) : -1

		// Сначала вперёд: fromIndex+1, fromIndex+2, ...
		for (let i = fromIndex + 1; i < this._ctx.driver.length; i++) {
			const item = this._ctx.driver[i]
			if (item && check(item)) return item
		}

		// Затем назад: fromIndex-1, fromIndex-2, ...
		for (let i = fromIndex - 1; i >= 0; i--) {
			const item = this._ctx.driver[i]
			if (item && check(item)) return item
		}

		return undefined
	}
}
