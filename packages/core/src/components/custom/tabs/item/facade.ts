import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext } from '../../../base/collection'
import type { TAriaAttributes } from '../../../../common'
import type { TTabsCollectionExtensions } from '../collection/types'
import type { ITabsItem } from './types'

/**
 * Фасад элемента таба.
 *
 * Держит `TItemContext` (item-адаптеры) и выставляет item-пропсы коллекции
 * (`active`, `order`, `tabs_closable`) как обычные свойства компонента.
 * Используется как `ctor` в `TabsCollectionItemDescriptor`.
 */
export class TTabsItemCollectionFacade extends TCollectionItemComponent<
	ITabsItem,
	TTabsCollectionExtensions
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.activation.events, ['change:active'])

		this.events.relay(this._context.adapters.order.events, ['change:order'])

		this.events.relay(this._context.adapters.tabs.events, ['change:closable'])
	}

	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	set active(value: boolean) {
		if (this._context) {
			this._context.adapters.activation.active = value
		}
	}

	get order(): number {
		return this._context?.adapters.order.order ?? -1
	}

	get closable(): boolean {
		return this._context?.adapters.tabs.closable ?? false
	}

	/**
	 * Сторона таба в связке: `id` и ссылка на панель.
	 *
	 * Не в `TTabsItem.aria`, потому что `aria-controls` предполагает панель, а о
	 * её существовании знает коллекция, не элемент. Считает адаптер `content` —
	 * тот же, что отдаёт встречную половину панели, поэтому идентификаторы
	 * разойтись не могут.
	 */
	get tab_aria(): TAriaAttributes {
		return this._context?.adapters.content.tabAria ?? {}
	}
}
