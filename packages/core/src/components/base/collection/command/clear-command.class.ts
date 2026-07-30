// command/clear-command.class.ts

import type { IStorage } from '../storage';
import type { TEvented } from '../../../../common/event';
import type { TEngineEvents } from '../types';
import type { ICommand } from './types';

export class TClearCommand<T> implements ICommand<T> {
    private _removedItems: T[] = [];

    apply(storage: IStorage<T>): void {
        this._removedItems = [...storage.items];
        storage.clear();
    }

    emitEvents(events: TEvented<TEngineEvents<T>>, storage: IStorage<T>): void {
        this._removedItems.forEach(item => events.emit('item:removed', item));
        events.emit('change:count', storage.items.length);
        events.emit('reset');
    }
}
