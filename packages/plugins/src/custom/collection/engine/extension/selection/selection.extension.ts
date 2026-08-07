import type { IExtension, IExtensionContext } from '../types'
import type { TSelectionEvents, TSelectionMode, ISelectionExtension } from './types'
import { TEvented } from '@soldy/core'
import type { IItemExtensionCtor } from '../types'
import { TSelectionItemExtension, type ISelectionItemExtension } from './item'

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
export class TSelectionExtension<TItem extends object = any> implements IExtension<TItem>, ISelectionExtension<TItem> {
	readonly name = 'selection'
	readonly events = new TEvented<TSelectionEvents<TItem>>()

	private ctx!: IExtensionContext<TItem>
	private _selected: Set<TItem> = new Set()
	private _mode: TSelectionMode = 'single'
	private readonly _itemCtor?: IItemExtensionCtor<TItem, TSelectionExtension<TItem>, ISelectionItemExtension<TItem>>

	constructor(options?: { itemCtor?: IItemExtensionCtor<TItem, TSelectionExtension<TItem>, ISelectionItemExtension<TItem>> }) {
		this._itemCtor = options?.itemCtor
	}

	/** Создаёт stateless-делегат для конкретного элемента */
	createItem(owner: TItem): ISelectionItemExtension<TItem> {
		const Ctor = this._itemCtor ?? TSelectionItemExtension

		return new Ctor(owner, this)
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
		this.ctx = ctx

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
	}

	select(item: TItem): void {
		if (this._mode === 'none') return
		if (!this.ctx.engine.includes(item)) return

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

	getSelected(): TItem[] {
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
		this.events.emit('change:selection', this.getSelected())
	}
}
