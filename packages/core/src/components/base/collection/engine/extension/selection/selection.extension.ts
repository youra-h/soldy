import type { IExtension, IExtensionContext, IBaseOwnerItemExtensionOptions } from '../types'
import type { TSelectionEvents, TSelectionMode, ISelectionExtension } from './types'
import type { ISelectionItemExtension } from './item'
import { TSelectionItemExtension } from './item'
import { TBaseOwnerItemExtension } from '../base-owner-item-extension.class'
import type { TMetaExtension } from '../meta'
import type { TDataset } from '../../../../../../common'

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

		this.events.on('change:selection', () => this._syncDataset())
		ctx.driver.events.on('item:added', () => this._syncDataset())
		ctx.driver.events.on('change:items', () => this._syncDataset())
		this._syncDataset()

		ctx.driver.events.on('item:removed', (item: TItem) => {
			if (this._selected.has(item)) {
				this._selected.delete(item)
			}
		})

		ctx.driver.events.on('reset', () => {
			this.resetSelection()
		})

		ctx.driver.events.on('change:items', (items: readonly TItem[]) => {
			this._selected.forEach((item) => {
				if (!items.includes(item)) this._selected.delete(item)
			})
		})

		const meta = ctx.extensions.meta as TMetaExtension<TItem> | undefined

		if (meta) {
			meta.events.on('meta:applied', (item, m) => {
				if (!m.selected) return

				this.select(item)
			})

			meta.events.on('meta:changed', (item, m) => {
				if (!m.selected) return

				this.select(item)
			})
		}
	}

	/**
	 * Зеркалит выбор в `data-selected` элементов — контракт с темой.
	 *
	 * Здесь, а не в расширении каждого компонента: `data-selected` у Accordion,
	 * ListBox и Select один и тот же, различается только ARIA (`aria-selected`
	 * у опции, `aria-expanded` у секции) — она и остаётся за расширением
	 * компонента. Раньше это делали шаблоны, и при портировании на остальные
	 * пять адаптеров копий стало бы пятнадцать.
	 *
	 * Здесь, а не в item-расширении, потому что item-расширения создаются
	 * лениво — только когда адаптер запросит контекст элемента. Атрибут же
	 * обязан стоять с первой отрисовки, включая серверную.
	 *
	 * Атрибут проставляется **всем** элементам, а не только выбранным: тема
	 * смотрит `[data-selected='true']`, и «не выбран» надо отличать от
	 * «состояние неприменимо».
	 *
	 * Движок коллекции визуального слоя не касается, поэтому проверка, а не
	 * приведение типа: элементом коллекции может быть и не компонент.
	 */
	private _syncDataset(): void {
		this._ctx?.driver.forEach((item: TItem) => {
			;(item as { dataset?: TDataset }).dataset?.add('selected', this.isSelected(item))
		})
	}

	select(item: TItem): void {
		if (this._mode === 'none') return
		if (!this._ctx.driver.includes(item)) return

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
