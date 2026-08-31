import { TCollectionComponent } from '../../../base/collection'
import { TabsFactory } from './factory'
import type { TTabsCollection, TTabsCollectionExtensions } from './types'
import type { ITabItem } from '../tab-item/types'
import type { ITabs } from '../types'

/**
 * Фасад коллекции табов.
 *
 * Владеет `TCollection` (engine + расширения) и выставляет коллекционные props/методы
 * как обычные свойства компонента. Используется как `ctor` в `TabsCollectionDescriptor`.
 */
export class TTabsCollectionFacade extends TCollectionComponent<
	ITabItem,
	TTabsCollectionExtensions
> {
	constructor(
		owner: ITabs,
		options: { engine?: TTabsCollection; items?: any; trackBy?: (item: ITabItem) => any } = {},
	) {
		super(options.engine ?? TabsFactory(owner))

		if (options.items?.length) {
			this.items = options.items
		}

		if (options.trackBy) {
			this.trackBy = options.trackBy
		}

		this.events.relay(this.extensions.batch.events, [
			'items:added',
			'items:removed',
			'change:trackBy',
		])
		this.events.relay(this.extensions.activation.events, [
			'change:activation',
			'item:activated',
			'item:deactivated',
		])
		this.events.relay(this.extensions.tabs.events, ['item:close'])
	}

	get items(): ReadonlyArray<ITabItem> {
		return this.extensions.batch.items
	}

	set items(value: any) {
		this.extensions.batch.update(value)
	}

	get trackBy(): ((item: ITabItem) => any) | undefined {
		return this.extensions.batch.trackBy
	}

	set trackBy(fn: ((item: ITabItem) => any) | undefined) {
		this.extensions.batch.trackBy = fn
	}

	get activeItem(): ITabItem | undefined {
		return this.extensions.activation.activeItem
	}

	get closable(): boolean {
		return this.extensions.tabs.closable
	}

	activate(item: ITabItem): void {
		this.extensions.activation.activate(item)
	}

	closeTab(item: ITabItem): void {
		this.extensions.tabs.closeTab(item)
	}
}
