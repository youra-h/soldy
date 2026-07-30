import type { IExtension, IExtensionContext } from './types'
import { TEvented } from '../../../../common/event'

export type TSelectionEvents<T> = {
    'change:selection': (items: T[]) => void
}

/**
 * TSelectionExtension — расширение для управления выборкой элементов
 */
export class TSelectionExtension<T> implements IExtension<T> {
    readonly name = 'selection'
    readonly events = new TEvented<TSelectionEvents<T>>()

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
            this.events.emit('change:selection', Array.from(this.selected))
        }
    }

    deselect(item: T): void {
        this.selected.delete(item)
        this.events.emit('change:selection', Array.from(this.selected))
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
