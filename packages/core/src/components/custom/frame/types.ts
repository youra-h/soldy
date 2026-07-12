import type {
	IComponent,
	IComponentProps,
	TComponentEvents,
	TComponentStates,
} from '../../base/component'
import type { IStateUnit } from '../../../common'

export type TFramePosition = 'fixed' | 'absolute'

export interface IFrameProps extends IComponentProps {
	/** Позиция по оси X (px) */
	x?: number
	/** Позиция по оси Y (px) */
	y?: number
	/** Ширина (px или CSS-значение) */
	width?: number | string
	/** Высота (px или CSS-значение) */
	height?: number | string
	/** Видимость */
	visible?: boolean
	/** CSS-позиционирование: fixed (viewport) или absolute (родитель) */
	position?: TFramePosition
	/** CSS-селектор для Teleport (по умолчанию body) */
	target?: string
}

export type TFrameStates = TComponentStates & {
	x: IStateUnit<number>
	y: IStateUnit<number>
	width: IStateUnit<number | string>
	height: IStateUnit<number | string>
}

export type TFrameEvents = TComponentEvents & {
	/** changeX */
	changeX: (value: number) => void
	/** changeY */
	changeY: (value: number) => void
	/** changeWidth */
	changeWidth: (value: number | string) => void
	/** changeHeight */
	changeHeight: (value: number | string) => void
	/** changeZIndex — срабатывает при изменении z-index */
	changeZIndex: (value: number) => void
	/** changePosition */
	changePosition: (value: TFramePosition) => void
	/** changeTarget */
	changeTarget: (value: string) => void
}

export interface IFrame extends IComponent<IFrameProps, TFrameEvents> {
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
