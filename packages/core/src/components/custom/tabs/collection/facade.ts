import { TCollectionComponent } from '../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../base/collection'
import { TabsFactory } from './factory'
import type { TTabsCollection, TTabsCollectionExtensions } from './types'
import type { ITabsItem } from '../item/types'
import type { ITabs } from '../types'

/**
 * Фасад коллекции табов.
 *
 * Владеет `TCollectionEngine` (engine + расширения) и выставляет коллекционные props/методы
 * как обычные свойства компонента. Используется как `ctor` в `TabsCollectionDescriptor`.
 */
export class TTabsCollectionFacade extends TCollectionComponent<
	ITabsItem,
	TTabsCollectionExtensions
> {
	constructor(
		props: TCollectionFacadeProps<ITabsItem> = {},
		options: TCollectionFacadeOptions<TTabsCollection, ITabs> = {},
	) {
		super({}, { engine: options.engine ?? TabsFactory(options.owner!) })

		if (props.items?.length) {
			this.items = props.items
		}

		if (props.trackBy) {
			this.trackBy = props.trackBy
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

		this.events.relay(this.extensions.tabs.events, ['item:close', 'change:closable'])
	}

	get items(): ReadonlyArray<ITabsItem> {
		return this.extensions.batch.items
	}

	set items(value: any) {
		this.extensions.batch.update(value)
	}

	get trackBy(): ((item: ITabsItem) => any) | undefined {
		return this.extensions.batch.trackBy
	}

	set trackBy(fn: ((item: ITabsItem) => any) | undefined) {
		this.extensions.batch.trackBy = fn
	}

	get activeItem(): ITabsItem | undefined {
		return this.extensions.activation.activeItem
	}

	get closable(): boolean {
		return this.extensions.tabs.closable
	}

	activate(item: ITabsItem): void {
		this.extensions.activation.activate(item)
	}

	closeTab(item: ITabsItem): void {
		this.extensions.tabs.closeTab(item)
	}
}
