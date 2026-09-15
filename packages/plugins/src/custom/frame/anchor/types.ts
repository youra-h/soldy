import type { TPluginEvents } from '../../../base'

/**
 * Сторона и выравнивание панели относительно якоря.
 *
 * Набор намеренно маленький: это выбор потребителя, а не подбор места.
 * Автоматический переворот при нехватке места (flip) и сдвиг у края экрана
 * (shift) плагин делает сам поверх этого выбора — см. `TAnchorPlugin`.
 */
export type TFramePlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export interface IAnchorPluginOptions {
	/** Сторона и выравнивание относительно якоря. По умолчанию `bottom-start`. */
	placement?: TFramePlacement
	/** Тянуть ширину панели по ширине якоря. */
	matchWidth?: boolean
	/**
	 * Переворачивать ли панель на противоположную сторону, когда на выбранной
	 * она не влезает по высоте окна. По умолчанию `true`. Выключенный flip
	 * оставляет сторону потребителя как есть; shift от него не зависит.
	 */
	flip?: boolean
	/** Отступ панели от якоря, px. По умолчанию `0`. */
	offset?: number
}

export type TAnchorPluginEvents = TPluginEvents & {
	/** change:anchor */
	'change:anchor': (element: Element | null) => void
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
 * Неймспейс (`anchor_anchor`) навешивает `DescriptorAllProps` в `@soldy/setup`
 * по `namespace` из `definePlugin`; здесь только собственные имена пропсов.
 */
export interface IAnchorPluginProps {
	anchor?: Element | null
	placement?: TFramePlacement
	matchWidth?: boolean
	flip?: boolean
	offset?: number
}
