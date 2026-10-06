import type { ISwipeable } from './types'

/**
 * Смахивают ли владельца, чтобы закрыть (`ISwipeable`).
 *
 * Плагин жеста стоит на разных компонентах — выезжающей панели, поповере,
 * Select и DatePicker, — общего предка у них нет, и владельца он берёт
 * рефлексией (`ctx.getInstance`).
 * Без контракта жеста плагину не с кем говорить: такого владельца он не
 * трогает. Тип-гард рядом с контрактом, как `isCloseRequestable`.
 */
export function isSwipeable(value: unknown): value is ISwipeable {
	return (
		typeof value === 'object' &&
		value !== null &&
		'swipe' in value &&
		'swipeSide' in value &&
		'beginSwipe' in value &&
		typeof value.beginSwipe === 'function' &&
		'endSwipe' in value &&
		typeof value.endSwipe === 'function'
	)
}
