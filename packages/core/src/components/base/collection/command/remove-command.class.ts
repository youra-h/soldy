// command/remove-command.class.ts

import type { IStorage } from '../storage';
import type { TBaseCollectionEvent } from '../types';
import type { ICommand } from './types';

export class TRemoveCommand<T> implements ICommand<T> {
    constructor(public item: T) {}

    apply(storage: IStorage<T>): void {
        storage.remove(this.item);
    }

    toEvents(): TBaseCollectionEvent<T>[] {
        return [{ type: 'item:removed', item: this.item }];
    }
}
