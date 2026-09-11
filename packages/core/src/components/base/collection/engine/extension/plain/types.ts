import type { TCollectionStorageDriverEvents } from '../../types'

export type TPlainEvents<TItem extends object = any> = TCollectionStorageDriverEvents<TItem> & {}
