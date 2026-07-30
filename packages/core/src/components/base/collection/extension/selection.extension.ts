// extension/selection.extension.ts — поведение выбора элементов

import type { IExtension, IExtensionContext } from './types';

export class TSelectionExtension<T> implements IExtension<T> {
    readonly name = 'selection';

    private ctx!: IExtensionContext<T>;
    private selected = new Set<T>();

    install(ctx: IExtensionContext<T>): void {
        this.ctx = ctx;

        ctx.events.on('item:removed', (item: T) => this.selected.delete(item));
        ctx.events.on('reset', () => this.selected.clear());

        ctx.events.on('change:items', (items: readonly T[]) => {
            this.selected.forEach(item => {
                if (!items.includes(item)) this.selected.delete(item);
            });
        });
    }

    select(item: T): void {
        if (this.ctx.storage.items.includes(item)) {
            this.selected.add(item);
            this.ctx.events.emit('selection:changed', Array.from(this.selected));
        }
    }

    deselect(item: T): void {
        this.selected.delete(item);
        this.ctx.events.emit('selection:changed', Array.from(this.selected));
    }

    toggle(item: T): void {
        if (this.selected.has(item)) this.deselect(item);
        else this.select(item);
    }

    getSelected(): T[] {
        return Array.from(this.selected);
    }

    isSelected(item: T): boolean {
        return this.selected.has(item);
    }
}
