import type { IModalLayer, IModalLayerProps, TModalLayerEvents } from '../../base/modal-layer'
import type { ISwipeable, TSwipe, TSwipeableEvents } from '../../base/layer'

/**
 * У какого края экрана стоит панель: логические стороны строки и верх с низом.
 *
 * Центра нет — центр у модального окна. Смысл у значения один в любой теме,
 * поэтому это union ядра, а не реестр темы — как `placement` у Dialog. `start`
 * и `end` — логические: в RTL панель сама встаёт у другого края, и жест
 * зеркалится вместе с ней.
 */
export type TDrawerPlacement = 'start' | 'end' | 'top' | 'bottom'

export type TDrawerEvents = TModalLayerEvents &
	TSwipeableEvents & {
		/** change:placement */
		'change:placement': (value: TDrawerPlacement) => void
		/** change:contained */
		'change:contained': (value: boolean) => void
		/** change:locksScroll — панель стала запирать прокрутку страницы или перестала */
		'change:locksScroll': (value: boolean) => void
	}

export interface IDrawerProps extends IModalLayerProps {
	/**
	 * Ширина панели у бокового края (`start`, `end`): число — px, строка —
	 * CSS-значение. Не задана — ширина темы
	 */
	width?: number | string
	/**
	 * Высота панели у верхнего и нижнего края (`top`, `bottom`): число — px,
	 * строка — CSS-значение. Не задана — по содержимому
	 */
	height?: number | string
	/** У какого края экрана стоит панель */
	placement?: TDrawerPlacement
	/** За что панель можно утянуть к её краю, чтобы закрыть */
	swipe?: TSwipe
	/**
	 * Панель внутри своего контейнера, а не поверх страницы: не
	 * телепортируется, встаёт в ближайшем позиционированном предке и не
	 * запирает прокрутку документа
	 */
	contained?: boolean
}

/**
 * Выезжающая панель. Смахивают её к её краю (`ISwipeable`): сторона ухода —
 * её край, `swipeSide` всегда равен `placement`.
 */
export interface IDrawer extends IModalLayer<IDrawerProps, TDrawerEvents>, ISwipeable {
	/** У какого края экрана стоит панель */
	placement: TDrawerPlacement
	/** Панель внутри своего контейнера, а не поверх страницы */
	contained: boolean
	/**
	 * Запирает ли панель прокрутку страницы: открыта и не `contained`. По нему
	 * `TScrollLockPlugin` держит замок документа
	 */
	readonly locksScroll: boolean
	/** Рисовать ли полосу у края, за которую тянут: жест включён */
	readonly handleRendered: boolean
}
