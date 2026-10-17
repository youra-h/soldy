import { TSelectionItemFacade } from '../../../../base/collection'
import type { TMenuCollectionExtensions } from '../../collection/types'
import type { IMenuItem } from '../types'

/**
 * Фасад пункта меню — один на действие и флажок.
 *
 * `selected` — из базы (`TSelectionItemFacade`): отметка флажка — выбор
 * коллекции меню, и разметка флажка рисует её по нему. Своего сверх базы
 * нет: что делает нажатие, решает item-адаптер `menu` (`choose`, `toggle`),
 * а разметка зовёт его через `context`. У item-адаптера своих событий нет —
 * пробрасывать фасаду нечего.
 */
export class TMenuItemCollectionFacade extends TSelectionItemFacade<
	IMenuItem,
	TMenuCollectionExtensions
> {}
