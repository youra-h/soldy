import { TActivationItemFacade } from '../../../../base/collection'
import type { TRadioGroupCollectionExtensions } from '../../collection/types'
import type { IRadioGroupItem } from '../types'

/**
 * Фасад радио.
 *
 * `active` (отмечено ли радио) и `order` — из `TActivationItemFacade`, своего
 * нет: всё остальное, что радио получает от группы, лежит в его собственных
 * свойствах.
 */
export class TRadioGroupItemCollectionFacade extends TActivationItemFacade<
	IRadioGroupItem,
	TRadioGroupCollectionExtensions
> {}
