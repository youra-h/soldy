// command/add-command.class.ts

import type { IStorage } from '../storage';
import type { TBaseCollectionEvent } from '../types';
import type { ICommand } from './types';

export class TAddCommand<T> implements ICommand<T> {
    constructor(public item: T) {}

    apply(storage: IStorage<T>): void {
        storage.add(this.item);
    }

    toEvents(): TBaseCollectionEvent<T>[] {
        return [{ type: 'item:added', item: this.item }];
    }
}
