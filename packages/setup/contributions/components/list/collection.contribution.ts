import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца List (выводятся фасадом TListCollectionFacade).
 */
export const ListCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента List (выводятся фасадом TListItemCollectionFacade).
 */
export const ListCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		list_wordWrap: {
			type: Boolean,
			protected: true,
			get: (instance) => instance.wordWrap,
			triggers: ['change:wordWrap'],
		},
	},
})
