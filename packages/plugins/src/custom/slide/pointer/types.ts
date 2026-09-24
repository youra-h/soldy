import type { TPluginEvents } from '../../../base'
import type { TSlideDirection } from '../types'

/**
 * Своих событий у плагина нет: результат жеста виден через владельца —
 * значение, `dragging` и `commit` сообщает он. Второй путь к тем же фактам
 * через события плагина разошёлся бы с первым.
 */
export type TSlidePointerPluginEvents = TPluginEvents

/** Жест, который ведёт плагин: от нажатия до отпускания. */
export type TSlidePointerGesture = {
	/** `pointerId` указателя жеста: чужие указатели его не двигают */
	pointer: number
	/** Дорожка: по её коробке указатель переводится в долю хода */
	track: Element
	/** Направление роста — на весь жест, вычислено при нажатии */
	direction: TSlideDirection
}
