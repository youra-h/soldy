import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TSelectCollectionExtensions } from '../../collection/types'
import type { ISelectItem } from '../types'
import { LIST_DEFAULTS } from '../../../list'
import type { TListIndicator } from '../../../list'

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
	override setContext(context: TItemContext<ISelectItem, TSelectCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.select.events, ['change:indicator'])
	}

	/**
	 * Сторона отметки выбранного. Значение одно на весь список и читается у
	 * поля: своей стороны у опции нет. Меняется только на инстансе поля.
	 */
	get indicator(): TListIndicator {
		return this._context ? this._context.adapters.select.indicator : LIST_DEFAULTS.indicator
	}

	/** Выбрать эту опцию — с учётом режима и `closeOnSelect` поля. */
	choose(): void {
		this._context?.adapters.select.choose()
	}
}
