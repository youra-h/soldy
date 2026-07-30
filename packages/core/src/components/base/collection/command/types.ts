// command/types.ts — интерфейс ICommand

import type { IStorage } from '../storage';
import type { TBaseCollectionEvent } from '../types';

export interface ICommand<T> {
    apply(storage: IStorage<T>): void;
    toEvents(): TBaseCollectionEvent<T>[];
}
