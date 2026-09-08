import type { TPluginEvents } from '../../../base'

export interface ISelectKeyboardPluginOptions {
	/**
	 * Сколько миллисекунд накапливать буфер набора.
	 *
	 * Печатные символы ищут опцию по началу текста: «мо» находит «Москва».
	 * Пауза дольше этой сбрасывает буфер, и следующий символ начинает поиск
	 * заново.
	 */
	typeaheadTimeout?: number
}

export type TSelectKeyboardPluginEvents = TPluginEvents & {
	/** Подсветка переехала на другую опцию (или снялась). */
	'change:highlight': (uid: string | number | null) => void
}
