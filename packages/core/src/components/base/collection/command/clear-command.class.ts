// command/clear-command.class.ts

import type { IStorage } from '../storage';
import type { TBaseCollectionEvent } from '../types';
import type { ICommand } from './types';

export class TClearCommand<T> implements ICommand<T> {
    private _removedItems: T[] = [];

    apply(storage: IStorage<T>): void {
        this._removedItems = [...storage.items];
        storage.clear();
    }

    toEvents(): TBaseCollectionEvent<T>[] {
        const events: TBaseCollectionEvent<T>[] = this._removedItems.map(item => ({
            type: 'item:removed' as const,
            item,
        }));
        events.push({ type: 'change:items', items: [] });
        return events;
    }
}
