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
 * Наружу отдаётся только `query` — то, что сейчас набрано. Реакция
 * (подсветка через `TSelectKeyboardPlugin`) видна снаружи уже через её
 * собственный `highlightedUid`, повторять её здесь незачем.
 */
export const SelectEditableContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'change:query'],
	props: {
		query: { protected: true, triggers: ['change:query'] },
	},
})

/**
 * Клик по полю Select.
 *
 * Ничего не отдаёт наружу: и открытость (`open`), и режим (`editable`) уже
 * читаются как пропы владельца. Контрибуция нужна лишь для того, чтобы
 * `create` попал в события, как и у любого плагина.
 */
export const SelectPointerContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
})

/**
 * Удаление тегов по `Backspace` в пустом поле Select.
 *
 * Ничего не отдаёт наружу: включает ли механизм состояние, целиком читается
 * через `owner.removeOnBackspace`. Контрибуция нужна лишь для того, чтобы
 * `create` попал в события, как и у любого плагина.
 */
export const SelectBackspaceContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
})
