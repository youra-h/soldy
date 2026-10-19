import type { TPluginEvents } from '../../../base'
import type { TPoint } from '../../../utils'

/**
 * Сторона и выравнивание панели относительно якоря.
 *
 * Сторона — `top` или `bottom`, выравнивания три: `-start` — по началу
 * якоря, `-end` — по концу, значение без суффикса — по центру (как у
 * Floating UI). Начало и конец логические: в RTL они меняются местами, центр
 * от направления не зависит.
 *
 * Набор намеренно маленький: это выбор потребителя, а не подбор места.
 * Автоматический переворот при нехватке места (flip) и сдвиг у края экрана
 * (shift) плагин делает сам поверх этого выбора — см. `TAnchorPlugin`.
 */
export type TFramePlacement =
	'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end'

/**
 * Прямоугольник места панели в координатах окна: якоря — его
 * `getBoundingClientRect()`, точки — нулевого размера. Расчёту хватает краёв
 * и ширины.
 */
export type TAnchorRect = Pick<DOMRectReadOnly, 'left' | 'top' | 'right' | 'bottom' | 'width'>

export interface IAnchorPluginOptions {
	/** Сторона и выравнивание относительно якоря. По умолчанию `bottom-start`. */
	placement?: TFramePlacement
	/** Тянуть ширину панели по ширине якоря. */
	matchWidth?: boolean
	/**
	 * Переворачивать ли панель на противоположную сторону, когда на выбранной
	 * она не влезает по высоте окна. По умолчанию `true`. Сторону выбирает
	 * показ, а открытая панель её держит: стоит, пока на ней влезает, и
	 * переходит на противоположную, только если влезает там, — прокрутка
	 * страницы не гоняет её туда и обратно. Выключенный flip оставляет сторону
	 * потребителя как есть; shift от него не зависит.
	 */
	flip?: boolean
	/** Отступ панели от якоря, px. По умолчанию `0`. */
	offset?: number
}

export type TAnchorPluginEvents = TPluginEvents & {
	/** change:anchor */
	'change:anchor': (element: Element | null) => void
	/** change:point */
	'change:point': (value: TPoint | null) => void
	/** change:placement */
	'change:placement': (value: TFramePlacement) => void
	/** change:matchWidth */
	'change:matchWidth': (value: boolean) => void
	/** change:flip */
	'change:flip': (value: boolean) => void
	/** change:offset */
	'change:offset': (value: number) => void
}

/**
 * Пропсы плагина такими, какими их объявляет contribution — без неймспейса.
 *
 * Неймспейс (`anchor_anchor`) навешивает `DescriptorAllProps` в `@soldy-ui/setup`
 * по `namespace` из `definePlugin`; здесь только собственные имена пропсов.
 */
export interface IAnchorPluginProps {
	anchor?: Element | null
	/**
	 * Точка в координатах окна, у которой встаёт панель, — главнее якоря,
	 * пока задана: контекстное меню встаёт у места вызова, а не у области.
	 */
	point?: TPoint | null
	placement?: TFramePlacement
	matchWidth?: boolean
	flip?: boolean
	offset?: number
}
