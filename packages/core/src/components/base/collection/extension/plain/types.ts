import type { TEngineEvents } from '../../types'
import type { TEvented } from '@soldy/core'

export type TPlainEvents<TItem extends object = any> = TEngineEvents<TItem> & {}
