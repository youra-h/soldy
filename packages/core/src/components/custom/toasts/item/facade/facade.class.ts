import { TOrderItemFacade } from '../../../../base/collection'
import type { TToastsCollectionExtensions } from '../../collection/types'
import type { IToastsItem } from '../types'

/**
 * Фасад тоста — его членство в коллекции Toasts.
 *
 * `order` — из `TOrderItemFacade`, своего нет: у расширения `toasts`
 * item-адаптера нет, а всё, что тост знает о себе, — его собственные
 * свойства.
 */
export class TToastsItemCollectionFacade extends TOrderItemFacade<
	IToastsItem,
	TToastsCollectionExtensions
> {}
