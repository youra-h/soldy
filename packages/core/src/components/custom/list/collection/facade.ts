import { TCollectionComponent } from '../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeProps,
	TSelectionMode,
	IExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import { ListFactory } from './factory'
import type { TListCollectionExtensions, TListCollectionFacadeOptions } from './types'
import type { IList } from '../types'
import type { IListItem } from '../list-item/types'

/**
 * Фасад коллекции list.
 *
 * Владеет `TCollectionEngine` (engine + расширения) и выставляет коллекционные props/методы
 * как обычные свойства компонента. Базовый фасад — ListBox наследует его.
 */
export class TListCollectionFacade<
	TItem extends IListItem = IListItem,
	TExtensions extends Record<string, IExtension<any>> = TListCollectionExtensions,
> extends TCollectionComponent<TItem, TExtensions> {
	constructor(
		props: TCollectionFacadeProps<TItem> = {},
		options: TListCollectionFacadeOptions<TItem, TExtensions> = {},
	) {
		const createEngine =
			options.factory ??
			(ListFactory as unknown as (owner: IList<any, any, any>) => TCollectionEngine<TItem, TExtensions>)

		super({}, { engine: options.engine ?? createEngine(options.owner!) })

		if (props.items?.length) {
			this.items = props.items
		}

		if (props.trackBy) {
			this.trackBy = props.trackBy
		}

		this.events.relay(this._batch.events, ['items:added', 'items:removed', 'change:trackBy'])
		this.events.relay(this._selection.events, ['change:selection', 'change:mode'])
	}

	get items(): ReadonlyArray<TItem> {
		return this._batch.items
	}

	set items(value: any) {
		this._batch.update(value)
	}

	get trackBy(): ((item: TItem) => any) | undefined {
		return this._batch.trackBy
	}

	set trackBy(fn: ((item: TItem) => any) | undefined) {
		this._batch.trackBy = fn
	}

	get mode(): TSelectionMode {
		return this._selection.mode
	}

	set mode(value: TSelectionMode) {
		this._selection.mode = value
	}

	get selected(): TItem[] {
		return this._selection.selected
	}

	set selected(value: TItem[]) {
		this._selection.resetSelection()

		for (const item of value) {
			this._selection.select(item)
		}
	}

	private get _batch(): TBatchExtension<TItem> {
		return this.extensions.batch as unknown as TBatchExtension<TItem>
	}

	private get _selection(): TSelectionExtension<TItem> {
		return this.extensions.selection as unknown as TSelectionExtension<TItem>
	}
}
