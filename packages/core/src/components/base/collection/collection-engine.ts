// collection-engine.ts — ядро коллекции: команды, батчинг, события

import type { IStorage } from './storage';
import type { ICommand } from './command';
import type { TBaseCollectionEvent, TEngineEvents } from './types';
import { TEvented } from '../../../common/event';

export class TCollectionEngine<T> {
    private _storage: IStorage<T>;
    private _isBatching = false;
    private _pendingEvents: TBaseCollectionEvent<T>[] = [];

    public readonly events = new TEvented<TEngineEvents<T>>();

    constructor(storage: IStorage<T>) {
        this._storage = storage;
    }

    get storage(): IStorage<T> {
        return this._storage;
    }

    public execute(command: ICommand<T>): void {
        command.apply(this._storage);
        const events = command.toEvents();

        if (!this._isBatching) {
            this._emitEvents(events);
        } else {
            this._pendingEvents.push(...events);
        }
    }

    public batch(action: () => void): void {
        const wasBatching = this._isBatching;
        this._isBatching = true;

        try {
            action();
        } finally {
            this._isBatching = wasBatching;

            if (!this._isBatching && this._pendingEvents.length > 0) {
                const eventsToEmit = [...this._pendingEvents];
                this._pendingEvents = [];
                this._emitEvents(eventsToEmit);
            }
        }
    }

    private _emitEvents(events: TBaseCollectionEvent<T>[]): void {
        const changeItems = events.find(e => e.type === 'change:items');
        const others = events.filter(e => e.type !== 'change:items');

        others.forEach(e => this.events.emit(e.type as any, e as any));

        this.events.emit('change:items', {
            type: 'change:items',
            items: this._storage.items,
        } as Extract<TBaseCollectionEvent<T>, { type: 'change:items' }>);
    }
}
