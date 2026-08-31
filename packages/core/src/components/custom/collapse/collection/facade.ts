import { TCollectionComponent } from '../../../base/collection'
import type { TSelectionMode } from '../../../base/collection'
import { CollapseFactory } from './factory'
import type { TCollapseCollection, TCollapseCollectionExtensions } from './types'
import type { ICollapseItem } from '../collapse-item/types'
import type { ICollapse } from '../types'

/**
 * Фасад коллекции collapse.
 *
 * Владеет `TCollection` (engine + расширения) и выставляет коллекционные props/методы
 * как обычные свойства компонента. Используется как `ctor` в `CollapseCollectionDescriptor`.
 */
export class TCollapseCollectionFacade extends TCollectionComponent<ICollapseItem, TCollapseCollectionExtensions> {
	constructor(
		owner: ICollapse,
		options: { engine?: TCollapseCollection; items?: any; trackBy?: (item: ICollapseItem) => any } = {},
	) {
		super(options.engine ?? CollapseFactory(owner))

		if (options.items?.length) {
			this.items = options.items
		}

		if (options.trackBy) {
			this.trackBy = options.trackBy
		}
	}

	protected _relayCollection(): void {
		this.events.relay(this.extensions.batch.events, ['items:added', 'items:removed', 'change:trackBy'])
		this.events.relay(this.extensions.selection.events, ['change:selection', 'change:mode'])
	}

	get items(): ReadonlyArray<ICollapseItem> {
		return this.extensions.batch.items
	}

	set items(value: any) {
		this.extensions.batch.update(value)
	}

	get trackBy(): ((item: ICollapseItem) => any) | undefined {
		return this.extensions.batch.trackBy
	}

	set trackBy(fn: ((item: ICollapseItem) => any) | undefined) {
		this.extensions.batch.trackBy = fn
	}

	get mode(): TSelectionMode {
		return this.extensions.selection.mode
	}

	get selected(): ICollapseItem[] {
		return this.extensions.selection.selected
	}

	get view(): ICollapse['view'] {
		return this.extensions.collapse.view
	}
}
