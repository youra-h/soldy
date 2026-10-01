import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../base/component-view'
import type {
	TChangeEvent,
	TComponentVariant,
	TThemeRegistry,
	TValuePayload,
} from '../../../common'

/** Реестр форм заглушки. Значения объявляет тема (см. `TThemeRegistry`). */
export interface ISkeletonShapes extends TThemeRegistry {}

export type TSkeletonShape = Extract<keyof ISkeletonShapes, string>

/** Реестр анимаций заглушки. Значения объявляет тема (см. `TThemeRegistry`). */
export interface ISkeletonAnimations extends TThemeRegistry {}

export type TSkeletonAnimation = Extract<keyof ISkeletonAnimations, string>

export interface ISkeletonProps extends IComponentViewProps {
	/** Форма заглушки. Не задана — модификатора нет, заглушка выглядит формой темы по умолчанию */
	shape?: TSkeletonShape
	/** Анимация заглушки. Не задана — модификатора нет, как и у `shape` */
	animation?: TSkeletonAnimation
	variant?: TComponentVariant
	width?: number | string
	height?: number | string
}

export type TSkeletonEvents = TComponentViewEvents & {
	'change:variant': (payload: TValuePayload<TComponentVariant | undefined>) => void
	/** Запись своего `variant` — подправить или отменить (`TChangeEvent`) */
	'change:variant:before': (e: TChangeEvent<TComponentVariant | undefined>) => void
	'change:shape': (value: TSkeletonShape | undefined) => void
	'change:animation': (value: TSkeletonAnimation | undefined) => void
	'change:width': (value: number | string) => void
	'change:height': (value: number | string) => void
}

export interface ISkeleton extends IComponentView<ISkeletonProps, TSkeletonEvents> {
	shape: TSkeletonShape | undefined
	animation: TSkeletonAnimation | undefined
	variant: TComponentVariant | undefined
	width: number | string
	height: number | string
}
