import { TCollectionItemComponent } from '../../../base/collection'
import type { TTabsCollectionExtensions } from '../collection/types'
import type { ITabItem } from './types'

/**
 * Фасад элемента таба.
 *
 * Держит `TItemContext` (item-адаптеры) и выставляет item-пропсы коллекции
 * (`active`, `order`, `tabs_closable`) как обычные свойства компонента.
 * Используется как `ctor` в `TabsCollectionItemDescriptor`.
 */
export class TTabItemCollectionFacade extends TCollectionItemComponent<
	ITabItem,
	TTabsCollectionExtensions
> {
	protected _relayAdapters(): void {
		if (!this._context) return

		this.events.relay(this._context.adapters.activation.events, ['change:active'])
		this.events.relay(this._context.adapters.order.events, ['change:order'])
		this.events.relay(this._context.adapters.tabs.events, [
			{ from: 'change:closable', as: 'change:tabs_closable' },
		])
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

	get tabs_closable(): boolean {
		return this._context?.adapters.tabs.closable ?? false
	}
}
