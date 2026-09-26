import type { TPluginEvents } from '../../../base'
import type { TInlineSpan } from '../../../utils'

/**
 * Своих событий у плагина нет: результат замера виден через инстанс —
 * `canPrev`/`canNext` и `data-can-*` отдаёт ядро, оно же сообщает об их
 * смене. Второй путь к тому же факту, через события плагина, разошёлся бы
 * с первым.
 */
export type TScrollerViewportPluginEvents = TPluginEvents

/**
 * Отрезок по строке — общий тип доводки (`utils`). Наружу его отдаёт лента:
 * им описаны опции `resolveFocusShift`.
 */
export type { TInlineSpan }

/** Что плагин намерил, когда фокус пришёл в ленту, — всё отрезками по строке. */
export type TFocusShiftOptions = {
	/**
	 * Окно снапа — паддинг-бокс вьюпорта без `scroll-padding` с каждой
	 * стороны. Тема делает его чистой частью ленты, между подсказками у краёв.
	 */
	snapport: TInlineSpan
	/** Элемент под фокусом. */
	focused: TInlineSpan
	/**
	 * Элемент ленты, в котором он лежит, — прямой ребёнок вьюпорта. Точки
	 * снапа тема ставит на них: `scroll-snap-align: start`.
	 */
	item: TInlineSpan
	/** Письмо справа налево: начало строки — правый край. */
	rtl: boolean
}
