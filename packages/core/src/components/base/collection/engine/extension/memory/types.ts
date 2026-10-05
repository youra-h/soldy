import type { IExtension } from '../types'
import type { IQueryStrategy } from '../../types'
import type { TNoEvents } from '@soldy-ui/core'

/** Событий у расширения нет — см. `TNoEvents`. */
export type TMemoryEvents = TNoEvents

/**
 * Контракт памяти выборки: расширение коллекции, которое служит драйверу
 * стратегией чтения — помнит выборку, пока драйвер не сообщит, что она
 * устарела.
 */
export interface IMemoryExtension<TItem extends object = any>
	extends IExtension<TItem, TMemoryEvents>, IQueryStrategy<TItem> {}
