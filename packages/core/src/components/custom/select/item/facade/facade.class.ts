import { TSelectionItemFacade } from '../../../../base/collection'
import type { TSelectCollectionExtensions } from '../../collection/types'
import type { ISelectItem } from '../types'

/**
 * Фасад опции.
 *
 * `selected` и `order` — из базы; своё — только выбор с учётом режима и
 * `closeOnSelect` поля.
 */
export class TSelectItemCollectionFacade extends TSelectionItemFacade<
	ISelectItem,
	TSelectCollectionExtensions
> {
	/** Выбрать эту опцию — с учётом режима и `closeOnSelect` поля. */
	choose(): void {
		this._context?.adapters.select.choose()
	}
}
