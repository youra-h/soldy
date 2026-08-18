import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TSelectionEvents, TSelectionMode, ISelectionExtension } from './types'
import type { ISelectionItemExtension } from './item'
import { TSelectionItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'

/**
 * TSelectionExtension — расширение для управления выборкой элементов.
 *
 * Поддерживает режимы:
 * - `'none'` — выделение запрещено
 * - `'single'` — только один элемент
 * - `'multiple'` — любое количество элементов
 *
 * @template TItem — тип элемента коллекции (пользователь может расширить)
 */
export class TSelectionExtension<TItem extends object = any>
	extends TBaseOwnerItemExtension<TItem, ISelectionItemExtension<TItem>, TSelectionEvents<TItem>>
	implements IExtension<TItem>, ISelectionExtension<TItem>
{
	readonly name = 'selection' as const

	private _selected: Set<TItem> = new Set()
	private _mode: TSelectionMode = 'single'

	constructor(options?: IBaseOwnerItemExtensionOptions<TItem, ISelectionItemExtension<TItem>>) {
		super(TSelectionItemExtension, options)
	}

	get mode(): TSelectionMode {
		return this._mode
	}

	set mode(value: TSelectionMode) {
		if (this._mode === value) return

		if (value === 'single' && this._selected.size > 1) {
			// оставить выбранным только первый
			const first = this._selected.values().next().value as TItem

			this._selected.clear()
			this._selected.add(first)
		}

		if (value === 'none') {
			// полностью очистить выбор
			this.resetSelection()
		}

		this._mode = value
		this.events.emit('change:mode', value)
	}

	get multiple(): boolean {
		return this._mode === 'multiple'
	}

	get single(): boolean {
		return this._mode === 'single'
	}

	install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.engine.events.on('item:removed', (item: TItem) => {
			if (this._selected.has(item)) {
				this._selected.delete(item)
			}
		})

		ctx.engine.events.on('reset', () => {
			this.resetSelection()
		})

		ctx.engine.events.on('change:items', (items: readonly TItem[]) => {
			this._selected.forEach((item) => {
				if (!items.includes(item)) this._selected.delete(item)
			})
		})

		ctx.engine.events.on('item:added', (e) => {
			if (!e._.selected) return

			this.select(e.item as TItem)
		})
	}

	select(item: TItem): void {
		if (this._mode === 'none') return
		if (!this._ctx.engine.includes(item)) return

		if (!this.multiple) {
			// снять выделение с предыдущего
			this._selected.clear()
		}

		this._selected.add(item)

		this._notifySelected()
	}

	deselect(item: TItem): void {
		if (this._mode === 'none') return

		if (!this._selected.has(item)) return

		this._selected.delete(item)

		this._notifySelected()
	}

	toggle(item: TItem): void {
		if (this._mode === 'none') return

		if (this._selected.has(item)) {
			this.deselect(item)
		} else {
			this.select(item)
		}
	}

	get selected(): TItem[] {
		return Array.from(this._selected)
	}

	isSelected(item: TItem): boolean {
		return this._selected.has(item)
	}

	get selectedCount(): number {
		return this._selected.size
	}

	/**
	 * Полная очистка выделения.
	 */
	resetSelection(): void {
		if (this._selected.size > 0) {
			this._selected.clear()

			this._notifySelected()
		}
	}

	/**
	 * Уведомление об изменении выделения.
	 */
	private _notifySelected(): void {
		this.events.emit('change:selection', this.selected)
	}
}
