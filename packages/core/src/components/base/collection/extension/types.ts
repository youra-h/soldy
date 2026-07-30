// extension/types.ts — интерфейсы IExtension и IExtensionContext

import type { ICollectionEngine } from '../collection-engine';
import type { ICommand } from '../command';
import type { TCollection } from '../collection.class';

export interface IExtensionContext<T> {
    readonly engine: ICollectionEngine<T>
    readonly collection: TCollection<T, any>
    execute(command: ICommand<T>): void
    batch(action: () => void): void
}

export interface IExtension<T> {
    readonly name: string;
    install(ctx: IExtensionContext<T>): void;
}
