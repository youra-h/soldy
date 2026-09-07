import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext } from '../../../base/collection'
import type { TAriaAttributes } from '../../../../common'
import type { TCollapseCollectionExtensions } from '../collection/types'
import type { ICollapseItem } from './types'
import type { TCollapseView } from '../types'

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
		this.events.relay(this._context.adapters.collapse.events, ['change:view'])
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

	get view(): TCollapseView {
		return this._context?.adapters.collapse.view!
	}

	/**
	 * Сторона панели: роль, `id` и ссылка на заголовок.
	 *
	 * Осталась пропом, в отличие от стороны заголовка: та пишется прямо в
	 * `aria` элемента, а у панели Collapse своего компонента нет — она лежит
	 * внутри элемента, и набора, в который можно писать, у неё не существует.
	 */
	get content_aria(): TAriaAttributes {
		return this._context?.adapters.content.contentAria ?? {}
	}
}
