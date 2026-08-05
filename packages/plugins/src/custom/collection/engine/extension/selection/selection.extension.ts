import type { IExtension, IExtensionContext } from '../types'
import type { TSelectionEvents, TSelectionMode } from './types'
import { TEvented } from '@soldy/core'

/**
 * TSelectionExtension — расширение для управления выборкой элементов.
 *
 * Поддерживает режимы:
 * - `'none'` — выделение запрещено
 * - `'single'` — только один элемент
 * - `'multiple'` — любое количество элементов
 */
export class TSelectionExtension<T> implements IExtension<T> {
	readonly name = 'selection'
	readonly events = new TEvented<TSelectionEvents<T>>()

	private ctx!: IExtensionContext<T>
	private _selected: Set<T> = new Set()
	private _mode: TSelectionMode = 'single'

	get mode(): TSelectionMode {
		return this._mode
	}

	set mode(value: TSelectionMode) {
		if (this._mode === value) return

		if (value === 'single' && this._selected.size > 1) {
			// оставить выбранным только первый
			const first = this._selected.values().next().value as T

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

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx

		ctx.engine.events.on('item:removed', (item: T) => {
			if (this._selected.has(item)) {
				this._selected.delete(item)
			}
		})

		ctx.engine.events.on('reset', () => {
			this.resetSelection()
		})

		ctx.engine.events.on('change:items', (items: readonly T[]) => {
			this._selected.forEach((item) => {
				if (!items.includes(item)) this._selected.delete(item)
			})
		})
	}

	select(item: T): void {
		if (this._mode === 'none') return
		if (!this.ctx.engine.includes(item)) return

		if (!this.multiple) {
			// снять выделение с предыдущего
			this._selected.clear()
		}

		this._selected.add(item)

		this._notifySelected()
	}

	deselect(item: T): void {
		if (this._mode === 'none') return

		if (!this._selected.has(item)) return

		this._selected.delete(item)

		this._notifySelected()
	}

	toggle(item: T): void {
		if (this._mode === 'none') return

		if (this._selected.has(item)) {
			this.deselect(item)
		} else {
			this.select(item)
		}
	}

	getSelected(): T[] {
		return Array.from(this._selected)
	}

	isSelected(item: T): boolean {
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
