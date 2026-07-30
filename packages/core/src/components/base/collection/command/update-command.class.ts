// command/update-command.class.ts

import type { IStorage } from '../storage';
import type { TEvented } from '../../../../common/event';
import type { TEngineEvents } from '../types';
import type { ICommand } from './types';

export class TUpdateCommand<T> implements ICommand<T> {
    constructor(public item: T, public changes: Partial<T>) {}

    apply(storage: IStorage<T>): void {
        Object.assign(this.item as object, this.changes);
    }

    emitEvents(events: TEvented<TEngineEvents<T>>): void {
        events.emit('item:updated', this.item, this.changes);
    }
}
