import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from '../../base/component-view'
import type { IStateUnit, TComponentVariant, TValuePayload } from '../../../common'

export type TSkeletonShape = 'rect' | 'rounded' | 'circle'

export type TSkeletonAnimation = 'pulse' | 'wave' | 'none'

export interface ISkeletonProps extends IComponentViewProps {
	shape?: TSkeletonShape
	animation?: TSkeletonAnimation
	variant?: TComponentVariant
	width?: number | string
	height?: number | string
}

export type TSkeletonStates = TComponentViewStates & {
	variant: IStateUnit<TComponentVariant>
}

export type TSkeletonEvents = TComponentViewEvents & {
	'change:variant': (payload: TValuePayload<TComponentVariant>) => void
	'change:shape': (value: TSkeletonShape) => void
	'change:animation': (value: TSkeletonAnimation) => void
	'change:width': (value: number | string) => void
	'change:height': (value: number | string) => void
}

export interface ISkeleton extends IComponentView<
	ISkeletonProps,
	TSkeletonEvents,
	TSkeletonStates
> {
	shape: TSkeletonShape
	animation: TSkeletonAnimation
	variant: TComponentVariant
	width: number | string
	height: number | string
}
