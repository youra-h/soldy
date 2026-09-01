import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ICollapseCollectionItemProps } from '../collection/types'

export type TCollapseArrowPlacement = 'start' | 'end'

export type TCollapseItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:arrowPlacement */
	'change:arrowPlacement': (value: TCollapseArrowPlacement) => void
}

export interface ICollapseItemProps
	extends IValueControlProps<string | number>,
		ICollapseCollectionItemProps {
	/** Текст заголовка элемента */
	text?: string
	/** Позиция иконки-стрелки */
	arrowPlacement?: TCollapseArrowPlacement
}

export type TCollapseItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
}

export interface ICollapseItem<
	TProps extends ICollapseItemProps = ICollapseItemProps,
	TEvents extends TCollapseItemEvents = TCollapseItemEvents,
	TStates extends TCollapseItemStates = TCollapseItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст заголовка элемента */
	text: string
	/** Позиция иконки-стрелки */
	arrowPlacement: TCollapseArrowPlacement
}

export type TCollapseItemOptions = IComponentOptions<TCollapseItemStates>

