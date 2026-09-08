import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext } from '../../../base/collection'
import type { TSelectCollectionExtensions } from '../collection/types'
import type { ISelectItem } from './types'

/**
 * Фасад опции.
 *
 * Держит `TItemContext` и выставляет item-пропсы коллекции (`selected`,
 * `order`, `optionId`) как обычные свойства компонента.
 */
export class TSelectItemCollectionFacade extends TCollectionItemComponent<
	ISelectItem,
	TSelectCollectionExtensions
> {
	override setContext(context: TItemContext<ISelectItem, TSelectCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.selection.events, ['change:selected'])
		this.events.relay(this._context.adapters.order.events, ['change:order'])
	}

	get selected(): boolean {
		return this._context?.adapters.selection.selected ?? false
	}

	get order(): number {
		return this._context?.adapters.order.order ?? -1
	}

	/** Выбрать эту опцию — с учётом режима и `closeOnSelect` поля. */
	choose(): void {
		this._context?.adapters.select.choose()
	}
}
