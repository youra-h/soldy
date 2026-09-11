import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Tags — то, что выводит фасад
 * `TTagsCollectionFacade`: режим выбора и сам выбор (как у ListBox). Дефолт
 * `mode` — `none`, задаётся в `TagsFactory`, здесь только контракт.
 */
export const TagsCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента Tags — то, что выводит фасад
 * `TTagsItemCollectionFacade`.
 */
export const TagsCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		tag_closable: {
			type: Boolean,
			protected: true,
			get: (instance) => instance.closable,
			triggers: ['change:closable'],
		},
	},
})
