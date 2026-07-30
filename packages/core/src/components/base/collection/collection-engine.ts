// collection-engine.ts — ядро коллекции: команды, батчинг, события

import type { IStorage } from './storage';
import type { ICommand } from './command';
import type { TEngineEvents } from './types';
import { TEvented } from '../../../common/event';

export interface ICollectionEngine<T> extends ReadonlyArray<T> {
    readonly events: TEvented<TEngineEvents<T>>;
    execute(command: ICommand<T>): void;
    batch(action: () => void): void;
}

export class TCollectionEngine<T> {
    [index: number]: T;

    private _storage: IStorage<T>;
    private _isBatching = false;
    private _pendingCommands: ICommand<T>[] = [];

    public readonly events = new TEvented<TEngineEvents<T>>();

    constructor(storage: IStorage<T>) {
        this._storage = storage;

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }

                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    return target._storage.items[Number(prop)];
                }

                const items = target._storage.items;
                const value = Reflect.get(items, prop);

                if (typeof value === 'function') {
                    return value.bind(items);
                }

                return value;
            },
        }) as unknown as TCollectionEngine<T>;
    }

    public execute(command: ICommand<T>): void {
        command.apply(this._storage);

        if (!this._isBatching) {
            command.emitEvents(this.events, this._storage);
            this.events.emit('change:items', this._storage.items);
        } else {
            this._pendingCommands.push(command);
        }
    }

    public batch(action: () => void): void {
        const wasBatching = this._isBatching;
        this._isBatching = true;

        try {
            action();
        } finally {
            this._isBatching = wasBatching;

            if (!this._isBatching && this._pendingCommands.length > 0) {
                const commandsToEmit = [...this._pendingCommands];
                this._pendingCommands = [];

                commandsToEmit.forEach(cmd => cmd.emitEvents(this.events, this._storage));

                this.events.emit('change:items', this._storage.items);
            }
        }
    }
}
