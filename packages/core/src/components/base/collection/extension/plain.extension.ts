// extension/plain.extension.ts — базовые CRUD-операции

import type { IExtension, IExtensionContext } from './types';
import { TAddCommand, TRemoveCommand, TUpdateCommand, TMoveCommand } from '../command';

export class TPlainExtension<T> implements IExtension<T> {
    readonly name = 'plain';

    private ctx!: IExtensionContext<T>;

    install(ctx: IExtensionContext<T>): void {
        this.ctx = ctx;
    }

    add(item: T): void {
        this.ctx.execute(new TAddCommand(item));
    }

    remove(item: T): void {
        this.ctx.execute(new TRemoveCommand(item));
    }

    update(item: T, changes: Partial<T>): void {
        this.ctx.execute(new TUpdateCommand(item, changes));
    }

    move(item: T, newIndex: number, oldIndex?: number): void {
        this.ctx.execute(new TMoveCommand(item, newIndex, oldIndex));
    }

    getAll(): T[] {
        return [...this.ctx.storage.items];
    }

    find(predicate: (item: T) => boolean): T | undefined {
        return this.ctx.storage.items.find(predicate);
    }

    filter(predicate: (item: T) => boolean): T[] {
        return this.ctx.storage.items.filter(predicate);
    }

    get(index: number): T | undefined {
        return this.ctx.storage.items[index];
    }

    get length(): number {
        return this.ctx.storage.items.length;
    }
}
