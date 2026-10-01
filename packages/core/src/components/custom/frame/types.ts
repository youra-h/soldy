import type { ILayer, ILayerProps, TLayerEvents } from '../../base/layer'

export type TFramePosition = 'fixed' | 'absolute'

export interface IFrameProps extends ILayerProps {
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
}

export type TFrameEvents = TLayerEvents & {
	/** change:x */
	'change:x': (value: number) => void
	/** change:y */
	'change:y': (value: number) => void
	/** change:width */
	'change:width': (value: number | string) => void
	/** change:height */
	'change:height': (value: number | string) => void
	/** change:position */
	'change:position': (value: TFramePosition) => void
}

export interface IFrame extends ILayer<IFrameProps, TFrameEvents> {
	/** Позиция по оси X */
	x: number
	/** Позиция по оси Y */
	y: number
	/** Ширина */
	width: number | string
	/** Высота */
	height: number | string
	/** CSS-позиционирование */
	position: TFramePosition
}
