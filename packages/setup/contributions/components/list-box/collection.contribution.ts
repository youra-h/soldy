import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../defineType'
import { TButtonView } from '@soldy/core'

/**
 * Коллекционные props/events владельца ListBox — то, что выводит фасад
 * `TListBoxCollectionFacade`: режим выбора и сам выбор.
 */
export const ListBoxCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента ListBox — то, что выводит фасад
 * `TListBoxItemCollectionFacade`.
 *
 * `list_wordWrap` отсюда ушёл: разрешение «значение элемента поверх значения
 * списка» больше не проходит через фасад — `data-word-wrap` элементам ставит
 * `TListLayoutPlugin`, который списочным `wordWrap` и владеет.
 */
export const ListBoxCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		view: {
			type: defineType<TButtonView>(String),
			protected: true,
			triggers: ['change:view'],
		},
	},
})
