import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from '../../base/component-view'
import type { IStateUnit } from '../../../common'

export type TFramePosition = 'fixed' | 'absolute'

export interface IFrameProps extends IComponentViewProps {
	/** Позиция по оси X (px) */
	x?: number
	/** Позиция по оси Y (px) */
	y?: number
	/** Ширина (px или CSS-значение) */
	width?: number | string
	/** Высота (px или CSS-значение) */
	height?: number | string
	/** CSS-позиционирование: fixed (viewport) или absolute (родитель) */
	position?: TFramePosition
	/** CSS-селектор для Teleport (по умолчанию body) */
	target?: string
}

export type TFrameStates = TComponentViewStates & {
	x: IStateUnit<number>
	y: IStateUnit<number>
	width: IStateUnit<number | string>
	height: IStateUnit<number | string>
}

export type TFrameEvents = TComponentViewEvents & {
	/** change:x */
	'change:x': (value: number) => void
	/** change:y */
	'change:y': (value: number) => void
	/** change:width */
	'change:width': (value: number | string) => void
	/** change:height */
	'change:height': (value: number | string) => void
	/** change:zIndex — срабатывает при изменении z-index */
	'change:zIndex': (value: number) => void
	/** change:position */
	'change:position': (value: TFramePosition) => void
	/** change:target */
	'change:target': (value: string) => void
}

export interface IFrame extends IComponentView<IFrameProps, TFrameEvents, TFrameStates> {
	/** Позиция по оси X */
	x: number
	/** Позиция по оси Y */
	y: number
	/** Ширина */
	width: number | string
	/** Высота */
	height: number | string
	/** Текущий z-index (readonly) */
	readonly zIndex: number
	/** CSS-позиционирование */
	position: TFramePosition
	/** Целевой элемент для Teleport */
	target: string
}
