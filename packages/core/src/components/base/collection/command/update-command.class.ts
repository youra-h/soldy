// command/update-command.class.ts

import type { IStorage } from '../storage';
import type { TBaseCollectionEvent } from '../types';
import type { ICommand } from './types';

export class TUpdateCommand<T> implements ICommand<T> {
    constructor(public item: T, public changes: Partial<T>) {}

    apply(storage: IStorage<T>): void {
        Object.assign(this.item as object, this.changes);
    }

    toEvents(): TBaseCollectionEvent<T>[] {
        return [{ type: 'item:updated', item: this.item, changes: this.changes }];
    }
}
