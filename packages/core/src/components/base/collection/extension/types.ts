// extension/types.ts — интерфейсы IExtension и IExtensionContext

import type { TEvented } from '../../../common/event';
import type { IStorage } from '../../storage';
import type { ICommand } from '../../command';
import type { TCollection } from '../../collection.class';

export interface IExtensionContext<T> {
    readonly storage: IStorage<T>;
    readonly events: TEvented<Record<string, (...args: any[]) => void>>;
    readonly collection: TCollection<T, any>;
    execute(command: ICommand<T>): void;
    batch(action: () => void): void;
}

export interface IExtension<T> {
    readonly name: string;
    install(ctx: IExtensionContext<T>): void;
}
