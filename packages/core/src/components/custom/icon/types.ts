import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type { TChangeEvent, TValuePayload, TComponentSize } from '../../../common'

export interface IIconProps extends IComponentViewProps {
	// Размер иконки
	size?: TComponentSize
	// Ширина иконки
	width?: number | string
	// Высота иконки
	height?: number | string
}

export type TIconEvents = TComponentViewEvents & {
	/** change:size */
	'change:size': (payload: TValuePayload<TComponentSize>) => void
	/** Запись своего `size` — подправить или отменить (`TChangeEvent`) */
	'change:size:before': (e: TChangeEvent<TComponentSize>) => void
	'change:width': (value: number | string | undefined) => void
	'change:height': (value: number | string | undefined) => void
}

export interface IIcon extends IComponentView<IIconProps, TIconEvents> {
	/** Размер иконки */
	size: TComponentSize
	/** Ширина иконки */
	width?: number | string
	/** Высота иконки */
	height?: number | string
}
