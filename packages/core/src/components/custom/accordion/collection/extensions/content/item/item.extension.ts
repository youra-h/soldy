import { TBaseItemExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'
import type { IAccordionItem } from '../../../../item/types'
import type { IAccordionContentExtension } from '../types'
import type { IAccordionContentItemExtension, TAccordionContentItemEventsExtension } from './types'

/**
 * TAccordionContentItemExtension — stateless-делегат связки «заголовок ↔ панель».
 *
 * Идентификаторы не считает: формула живёт в родительском расширении, чтобы
 * быть в одном месте. `aria-controls` заголовка и `id` панели — один и тот же
 * идентификатор, разнеси их, и они однажды разойдутся.
 *
 * Сторону заголовка родитель проставляет прямо в `aria` элемента; сторона
 * панели отдаётся отсюда пропом. Асимметрия не случайна: отдельного компонента
 * у панели Accordion нет — она лежит внутри элемента и отдельно от него не
 * существует, поэтому своего набора у неё тоже нет.
 */
export class TAccordionContentItemExtension<
	TItem extends IAccordionItem = IAccordionItem,
	TParent extends IAccordionContentExtension<TItem> = IAccordionContentExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TAccordionContentItemEventsExtension>
	implements IAccordionContentItemExtension<TItem>
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
