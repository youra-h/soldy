import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TAriaAttributes } from '../../../../../common'
import type { TCollapseCollectionExtensions } from '../../collection/types'
import type { ICollapseItem } from '../types'
import type { TCollapseView } from '../../types'

/**
 * Фасад элемента collapse.
 *
 * `selected` и `order` — из базы; своё — вид и сторона панели. Используется
 * как `ctor` в `CollapseCollectionItemDescriptor`.
 */
export class TCollapseItemCollectionFacade extends TSelectionItemFacade<
	ICollapseItem,
	TCollapseCollectionExtensions
> {
	override setContext(context: TItemContext<ICollapseItem, TCollapseCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.collapse.events, ['change:view'])
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
