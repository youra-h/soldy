import type { TListNavigationPluginEvents } from '../../list/navigation'

export interface ISelectKeyboardPluginOptions {
	/**
	 * Пауза набора по первым буквам, мс; по умолчанию 500, как у меню.
	 *
	 * Буквы, набранные быстрее неё, — одно слово: «мо» находит «Москва».
	 * После паузы следующая буква начинает набор заново.
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
