import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { ICollapseCollectionProps } from './collection/types'
import type { ICollapseItem, ICollapseItemProps } from './collapse-item/types'

export type TCollapseView = 'plain' | 'outlined' | 'filled'

export type TCollapseEvents = TControlEvents &
	TCollectionStorageDriverEvents<ICollapseItem> & {
		/** change:view */
		'change:view': (value: TCollapseView) => void
	}

/** Пропсы самого компонента Collapse (без коллекционной части). */
export interface ICollapseComponentProps extends IControlProps {
	/** Внешний вид компонента */
	view?: TCollapseView
}

/** Полный набор пропсов Collapse: компонент + коллекция (engine, items, trackBy, mode). */
export interface ICollapseProps
	extends ICollapseComponentProps,
		ICollapseCollectionProps<ICollapseItemProps, ICollapseItem> {}

export type TCollapseStates = TControlStates

export interface ICollapse extends IControl<ICollapseProps, TCollapseEvents> {
	/** Внешний вид компонента */
	view: TCollapseView
}
