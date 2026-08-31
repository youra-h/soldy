import type { TStorageDriverEvents } from '../../types'
import type { TEvented } from '@soldy/core'

export type TPlainEvents<TItem extends object = any> = TStorageDriverEvents<TItem> & {}
