// command/types.ts — интерфейс ICommand

import type { IStorage } from '../storage';
import type { TEvented } from '../../../../common/event';
import type { TEngineEvents } from '../types';

export interface ICommand<T> {
    apply(storage: IStorage<T>): void
    emitEvents(events: TEvented<TEngineEvents<T>>, storage: IStorage<T>): void
}
