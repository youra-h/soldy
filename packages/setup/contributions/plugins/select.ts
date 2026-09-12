import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Клавиатура поля выбора.
 *
 * Наружу отдаётся только подсветка — она нужна разметке, чтобы отличить
 * опцию под навигацией от выбранной. Всё остальное плагин делает сам.
 */
export const SelectKeyboardContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'change:highlight'],
	props: {
		highlightedUid: { protected: true, triggers: ['change:highlight'] },
	},
})

/**
 * Ввод текста в поле Select при `editable: true`.
 *
 * Наружу ничего своего не отдаёт: набранное — это `owner.inputValue` (Select,
 * не плагин), а реакция (подсветка через `TSelectKeyboardPlugin`) видна уже
 * через её собственный `highlightedUid`.
 */
export const SelectEditableContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
})
