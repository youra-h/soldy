import { TBaseItemExtension } from '../../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../../common'
import type { ITabsItem } from '../../../../item/types'
import type { ITabsContentExtension } from '../types'
import type { ITabsContentItemExtension, TTabsContentItemEventsExtension } from './types'

/**
 * TTabsContentItemExtension — stateless-делегат связки «таб ↔ панель».
 *
 * Идентификаторы не считает: формула живёт в родительском расширении, чтобы
 * быть в одном месте. `aria-controls` таба и `id` панели — один и тот же
 * идентификатор, разнеси их, и они однажды разойдутся. Панель своего
 * идентификатора не изобретает — берёт его у связанного таба.
 *
 * Сторону таба родитель проставляет сам при добавлении элемента; здесь она
 * остаётся доступной для чтения — так проще проверить, что половинки сошлись.
 */
export class TTabsContentItemExtension<
	TItem extends ITabsItem = ITabsItem,
	TParent extends ITabsContentExtension<TItem> = ITabsContentExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TTabsContentItemEventsExtension>
	implements ITabsContentItemExtension<TItem>
{
	get tabAria(): TAriaAttributes {
		return {
			id: this._parent.tabId(this._item),
			'aria-controls': this._parent.panelId(this._item),
		}
	}

	/**
	 * `tabindex="0"` — по паттерну APG Tabs: весь список табов — одна
	 * остановка Tab, и следующая за ним остановка — панель. Содержимое панели
	 * ядру неизвестно, поэтому фокусируемой она становится всегда, как в
	 * примере APG.
	 */
	get panelAria(): TAriaAttributes {
		return {
			role: 'tabpanel',
			id: this._parent.panelId(this._item),
			'aria-labelledby': this._parent.tabId(this._item),
			tabindex: '0',
		}
	}
}
