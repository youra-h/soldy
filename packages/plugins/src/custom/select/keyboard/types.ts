import type { TListNavigationPluginEvents } from '../../list/navigation'

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

export type TSelectKeyboardPluginEvents = TListNavigationPluginEvents
