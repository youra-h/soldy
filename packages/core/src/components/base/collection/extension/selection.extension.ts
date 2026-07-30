import type { IExtension, IExtensionContext } from './types'

/**
 * TSelectionExtension — расширение для управления выборкой элементов в коллекции
 */
export class TSelectionExtension<T> implements IExtension<T> {
	readonly name = 'selection'

	private ctx!: IExtensionContext<T>
	private selected = new Set<T>()

	install(ctx: IExtensionContext<T>): void {
		this.ctx = ctx

		ctx.engine.events.on('item:removed', (item: T) => this.selected.delete(item))
		ctx.engine.events.on('reset', () => this.selected.clear())

		ctx.engine.events.on('change:items', (items: readonly T[]) => {
			this.selected.forEach((item) => {
				if (!items.includes(item)) this.selected.delete(item)
			})
		})
	}

	select(item: T): void {
		if (this.ctx.engine.includes(item)) {
			this.selected.add(item)
			this.ctx.engine.events.emit('selection:changed', Array.from(this.selected))
		}
	}

	deselect(item: T): void {
		this.selected.delete(item)
		this.ctx.engine.events.emit('selection:changed', Array.from(this.selected))
	}

	toggle(item: T): void {
		if (this.selected.has(item)) this.deselect(item)
		else this.select(item)
	}

	getSelected(): T[] {
		return Array.from(this.selected)
	}

	isSelected(item: T): boolean {
		return this.selected.has(item)
	}
}
