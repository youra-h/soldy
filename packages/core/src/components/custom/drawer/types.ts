import type { TComponentViewStates } from '../../base/component-view'
import type { IModalLayer, IModalLayerProps, TModalLayerEvents } from '../../base/modal-layer'

/**
 * У какого края экрана стоит панель: логические стороны строки и верх с низом.
 *
 * Центра нет — центр у модального окна. Смысл у значения один в любой теме,
 * поэтому это union ядра, а не реестр темы — как `placement` у Dialog. `start`
 * и `end` — логические: в RTL панель сама встаёт у другого края, и жест
 * зеркалится вместе с ней.
 */
export type TDrawerPlacement = 'start' | 'end' | 'top' | 'bottom'

/**
 * За что панель можно утянуть к её краю: ни за что (по умолчанию), за полосу
 * у края или за любое место, кроме контролов и прокручиваемых областей.
 *
 * Не `draggable`: это имя занято HTML-перетаскиванием и `TDragPlugin`. Значение
 * читают плагин жеста и разметка — это union ядра, а не реестр темы.
 */
export type TDrawerSwipe = 'none' | 'handle' | 'panel'

export type TDrawerEvents = TModalLayerEvents & {
	/** change:placement */
	'change:placement': (value: TDrawerPlacement) => void
	/** change:swipe */
	'change:swipe': (value: TDrawerSwipe) => void
	/** change:contained */
	'change:contained': (value: boolean) => void
	/** change:swiping — жест начался или кончился */
	'change:swiping': (value: boolean) => void
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
	swipe?: TDrawerSwipe
	/**
	 * Панель внутри своего контейнера, а не поверх страницы: не
	 * телепортируется, встаёт в ближайшем позиционированном предке и не
	 * запирает прокрутку документа
	 */
	contained?: boolean
}

export interface IDrawer extends IModalLayer<IDrawerProps, TDrawerEvents, TComponentViewStates> {
	/** У какого края экрана стоит панель */
	placement: TDrawerPlacement
	/** За что панель можно утянуть к её краю */
	swipe: TDrawerSwipe
	/** Панель внутри своего контейнера, а не поверх страницы */
	contained: boolean
	/** Идёт жест: панель тянут, и тема не анимирует её сдвиг */
	readonly swiping: boolean
	/**
	 * Запирает ли панель прокрутку страницы: открыта и не `contained`. По нему
	 * `TScrollLockPlugin` держит замок документа
	 */
	readonly locksScroll: boolean
	/** Рисовать ли полосу у края, за которую тянут: жест включён */
	readonly handleRendered: boolean
	/**
	 * Жест начался: панель тянут. Отказ — у скрытой панели и при выключенном
	 * жесте.
	 *
	 * @returns начался ли жест
	 */
	beginSwipe(): boolean
	/** Жест кончился: панель отпустили или жест отменён. Закрыть — `requestClose('swipe')` */
	endSwipe(): void
}
