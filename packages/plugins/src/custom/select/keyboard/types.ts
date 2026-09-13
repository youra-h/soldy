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

export type TSelectKeyboardPluginEvents = TListNavigationPluginEvents & {
	/**
	 * `Escape` нажат на уже закрытой панели — только в `editable`. Сам плагин
	 * ничего не делает: слушает `TEditablePlugin` (двойной Escape и возврат
	 * текста).
	 */
	escape: () => void
}
