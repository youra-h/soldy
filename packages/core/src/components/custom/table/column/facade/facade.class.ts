import { TOrderItemFacade } from '../../../../base/collection'
import type { TTableColumnsCollectionExtensions } from '../collection/types'
import type { ITableColumn } from '../types'

/**
 * Фасад колонки — её членство в коллекции колонок.
 *
 * `order` — из `TOrderItemFacade`, своего нет: всё остальное, что колонка
 * знает, лежит в её собственных свойствах.
 */
export class TTableColumnCollectionFacade extends TOrderItemFacade<
	ITableColumn,
	TTableColumnsCollectionExtensions
> {}
