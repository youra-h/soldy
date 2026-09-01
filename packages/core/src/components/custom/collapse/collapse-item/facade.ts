import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext } from '../../../base/collection'
import type { TCollapseCollectionExtensions } from '../collection/types'
import type { ICollapseItem } from './types'

/**
 * Фасад элемента collapse.
 *
 * Держит `TItemContext` (item-адаптеры) и выставляет item-пропсы коллекции
 * (`selected`, `order`, `collapse_view`) как обычные свойства компонента.
 * Используется как `ctor` в `CollapseCollectionItemDescriptor`.
 */
export class TCollapseItemCollectionFacade extends TCollectionItemComponent<
	ICollapseItem,
	TCollapseCollectionExtensions
> {
	override setContext(context: TItemContext<ICollapseItem, TCollapseCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.selection.events, ['change:selected'])
		this.events.relay(this._context.adapters.order.events, ['change:order'])
		this.events.relay(this._context.adapters.collapse.events, [
			{ from: 'change:view', as: 'change:collapse_view' },
		])
	}

	get selected(): boolean {
		return this._context?.adapters.selection.selected ?? false
	}

	set selected(value: boolean) {
		if (this._context) {
			this._context.adapters.selection.selected = value
		}
	}

	get order(): number {
		return this._context?.adapters.order.order ?? -1
	}

	get view(): string {
		return this._context?.adapters.collapse.view ?? ''
	}
}
