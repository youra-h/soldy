import { TActivationItemFacade } from '../../../../base/collection'
import type { TPaginationCollectionExtensions } from '../../collection/types'
import type { IPaginationItem } from '../types'

/**
 * Фасад страницы — членство страницы в коллекции пагинации.
 *
 * `active` (текущая ли страница) и `order` — из `TActivationItemFacade`,
 * своего нет: всё остальное, что страница получает от пагинации, лежит в её
 * собственных свойствах и наборах.
 */
export class TPaginationItemCollectionFacade extends TActivationItemFacade<
	IPaginationItem,
	TPaginationCollectionExtensions
> {}
