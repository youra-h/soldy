// collection.class.ts — фасад TCollection

import { TCollectionEngine } from './collection-engine';
import { TArrayStorage } from './storage';
import type { IStorage } from './storage';
import type { IExtension, IExtensionContext } from './extension';
import type { ICommand } from './command';
import { TEvented } from '../../../common/event';
import type { TEngineEvents } from './types';

export class TCollection<
    T,
    TExtensions extends Record<string, IExtension<T>> = Record<string, never>,
> {
    private _engine: TCollectionEngine<T>;
    public readonly extensions: TExtensions;

    constructor(
        options: {
            storage?: IStorage<T>;
            extensions?: TExtensions;
        } = {},
    ) {
        this._engine = new TCollectionEngine(options.storage ?? new TArrayStorage<T>());
        this.extensions = (options.extensions ?? {}) as TExtensions;

        const ctx = this._createContext();
        for (const ext of Object.values<IExtension<T>>(this.extensions)) {
            ext.install(ctx);
        }
    }

    private _createContext(): IExtensionContext<T> {
        return {
            storage: this._engine.storage,
            events: this._engine.events as TEvented<any>,
            collection: this as any,
            execute: (cmd: ICommand<T>) => this._engine.execute(cmd),
            batch: (action: () => void) => this._engine.batch(action),
        };
    }

    get events(): TEvented<TEngineEvents<T>> {
        return this._engine.events;
    }

    get storage(): IStorage<T> {
        return this._engine.storage;
    }

    batch(action: () => void): void {
        this._engine.batch(action);
    }
}
