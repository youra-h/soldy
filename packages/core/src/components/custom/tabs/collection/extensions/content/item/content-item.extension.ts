import { TBaseItemExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'
import type { ITabItem } from '../../../../tab-item/types'
import type { ITabsContentExtension } from '../types'
import type { ITabsContentItemExtension, TTabsContentItemEventsExtension } from './types'

/**
 * TTabsContentItemExtension — stateless-делегат связки «таб ↔ панель».
 *
 * Обе стороны считаются здесь, потому что адаптер знает свой элемент.
 * `aria-controls` таба и `id` панели — один и тот же идентификатор: разнеси
 * их по разным местам, и они однажды разойдутся.
 *
 * Основа идентификаторов — `uid` таба: он уникален в рамках сессии, поэтому
 * две группы табов на странице не столкнутся, даже если значения совпадают.
 * Панель своего идентификатора не изобретает — берёт его у связанного таба.
 */
export class TTabsContentItemExtension<
		TItem extends ITabItem = ITabItem,
		TParent extends ITabsContentExtension<TItem> = ITabsContentExtension<TItem>,
	>
	extends TBaseItemExtension<TItem, TParent, TTabsContentItemEventsExtension>
	implements ITabsContentItemExtension<TItem>
{
	/** id элемента с `role="tab"`. */
	private get _tabId(): string {
		return `s-tab-${this._item.uid}`
	}

	/** id элемента с `role="tabpanel"`. */
	private get _panelId(): string {
		return `s-tabpanel-${this._item.uid}`
	}

	get tabAria(): TAriaAttributes {
		return {
			id: this._tabId,
			'aria-controls': this._panelId,
		}
	}

	get panelAria(): TAriaAttributes {
		return {
			role: 'tabpanel',
			id: this._panelId,
			'aria-labelledby': this._tabId,
		}
	}
}
