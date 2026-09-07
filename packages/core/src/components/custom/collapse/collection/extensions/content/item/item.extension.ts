import { TBaseItemExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'
import type { ICollapseItem } from '../../../../item/types'
import type { ICollapseContentExtension } from '../types'
import type {
	ICollapseContentItemExtension,
	TCollapseContentItemEventsExtension,
} from './types'

/**
 * TCollapseContentItemExtension — stateless-делегат связки «заголовок ↔ панель».
 *
 * Обе стороны считаются здесь, потому что адаптер знает свой элемент.
 * `aria-controls` заголовка и `id` панели — один и тот же идентификатор:
 * разнеси их по разным местам, и они однажды разойдутся.
 *
 * Отдельного компонента у панели Collapse нет — она лежит внутри элемента и
 * отдельно от него не существует. Поэтому оба набора атрибутов потребляет один
 * и тот же шаблон элемента, в отличие от Tabs, где панель — самостоятельный
 * компонент рядом со списком.
 *
 * Раскрытость берётся у соседнего адаптера `selection`: у Collapse раскрытая
 * панель — это выбранный элемент.
 */
export class TCollapseContentItemExtension<
		TItem extends ICollapseItem = ICollapseItem,
		TParent extends ICollapseContentExtension<TItem> = ICollapseContentExtension<TItem>,
	>
	extends TBaseItemExtension<TItem, TParent, TCollapseContentItemEventsExtension>
	implements ICollapseContentItemExtension<TItem>
{
	/** id элемента-заголовка. */
	private get _headerId(): string {
		return `s-collapse-header-${this._item.uid}`
	}

	/** id раскрывающейся панели. */
	private get _contentId(): string {
		return `s-collapse-content-${this._item.uid}`
	}

	get headerAria(): TAriaAttributes {
		return {
			id: this._headerId,
			'aria-controls': this._contentId,
		}
	}

	get contentAria(): TAriaAttributes {
		return {
			role: 'region',
			id: this._contentId,
			'aria-labelledby': this._headerId,
		}
	}
}
