import type { TPluginEvents } from '../../../base'

/**
 * Сторона и выравнивание панели относительно якоря.
 *
 * Набор намеренно маленький: это выбор потребителя, а не подбор места.
 * Автоматический переворот при нехватке места (flip) и сдвиг у края экрана
 * (shift) — отдельная задача, здесь их нет.
 */
export type TFramePlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export interface IAnchorPluginOptions {
	/** Сторона и выравнивание относительно якоря. По умолчанию `bottom-start`. */
	placement?: TFramePlacement
	/** Тянуть ширину панели по ширине якоря. */
	matchWidth?: boolean
}

export type TAnchorPluginEvents = TPluginEvents & {
	/** change:anchor */
	'change:anchor': (element: HTMLElement | null) => void
	/** change:placement */
	'change:placement': (value: TFramePlacement) => void
	/** change:matchWidth */
	'change:matchWidth': (value: boolean) => void
}
