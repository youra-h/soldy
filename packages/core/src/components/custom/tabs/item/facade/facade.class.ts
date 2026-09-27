import { TActivationItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TTabsCollectionExtensions,
	TTabsItemCollectionFacadeEvents,
} from '../../collection/types'
import type { ITabsItem } from '../types'

/**
 * Фасад элемента таба.
 *
 * `active` и `order` — из `TActivationItemFacade`: у таба активность, а не
 * выбор. Своё — только `tab_closable`.
 */
export class TTabsItemCollectionFacade extends TActivationItemFacade<
	ITabsItem,
	TTabsCollectionExtensions,
	TTabsItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.tabs.events)
	}

	/**
	 * Можно ли закрыть таб — итог item-адаптера `tabs`: выключенный таб не
	 * закрывается, у включённого своё значение важнее значения набора.
	 *
	 * Имя с префиксом, как `content_aria` у секции Accordion: значения фасада и
	 * самого таба в разметке сливаются в один объект, и у таба уже есть свой
	 * `closable` — трёхзначный, «как у набора». Геттер назван так же, как проп
	 * фасада, поэтому состояние адаптера в типах его знает.
	 */
	get tab_closable(): boolean {
		return this._context?.adapters.tabs.closable ?? false
	}
}
