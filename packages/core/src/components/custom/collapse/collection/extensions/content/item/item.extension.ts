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
 * Идентификаторы не считает: формула живёт в родительском расширении, чтобы
 * быть в одном месте. `aria-controls` заголовка и `id` панели — один и тот же
 * идентификатор, разнеси их, и они однажды разойдутся.
 *
 * Сторону заголовка родитель проставляет прямо в `aria` элемента; сторона
 * панели отдаётся отсюда пропом. Асимметрия не случайна: отдельного компонента
 * у панели Collapse нет — она лежит внутри элемента и отдельно от него не
 * существует, поэтому своего набора у неё тоже нет.
 */
export class TCollapseContentItemExtension<
		TItem extends ICollapseItem = ICollapseItem,
		TParent extends ICollapseContentExtension<TItem> = ICollapseContentExtension<TItem>,
	>
	extends TBaseItemExtension<TItem, TParent, TCollapseContentItemEventsExtension>
	implements ICollapseContentItemExtension<TItem>
{
	get headerAria(): TAriaAttributes {
		return {
			id: this._parent.headerId(this._item),
			'aria-controls': this._parent.contentId(this._item),
		}
	}

	get contentAria(): TAriaAttributes {
		return {
			role: 'region',
			id: this._parent.contentId(this._item),
			'aria-labelledby': this._parent.headerId(this._item),
		}
	}
}
