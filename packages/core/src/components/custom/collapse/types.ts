import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type {
	TSelectableCollection,
	TSelectableCollectionEvents,
	TSelectionMode,
	TItemProxyEvents,
	ISelectableCollectionProps,
} from '../../base/collection'
import type { ICollapseItem } from './collapse-item/types'

export type TCollapseView = 'plain' | 'outlined' | 'filled'

export type TCollapseEvents = TControlEvents &
	TSelectableCollectionEvents &
	TItemProxyEvents<ICollapseItem> & {
		/** changeView */
		changeView: (value: TCollapseView) => void
		itemText: (item: ICollapseItem, value: string) => void
		itemRendered: (item: ICollapseItem, value: boolean) => void
		itemVisible: (item: ICollapseItem, value: boolean) => void
		itemPresent: (item: ICollapseItem, value: boolean) => void
	}

export interface ICollapseProps<
	TItem extends ICollapseItem = ICollapseItem,
> extends IControlProps, ISelectableCollectionProps<TItem> {
	/** Внешний вид компонента */
	view?: TCollapseView
}

export type TCollapseStates = TControlStates

export interface ICollapse extends IControl<ICollapseProps, TCollapseEvents> {
	/** Внешний вид компонента */
	view: TCollapseView
	/** Режим выбора */
	mode: TSelectionMode
	/** Доступ к коллекции элементов */
	readonly collection: TSelectableCollection<any, any, ICollapseItem>
}
