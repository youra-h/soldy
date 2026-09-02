import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца ListBox (выводятся фасадом TListBoxCollectionFacade).
 */
export const ListBoxCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента ListBox (выводятся фасадом TListBoxItemCollectionFacade).
 */
export const ListBoxCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		list_wordWrap: {
			type: Boolean,
			protected: true,
			get: (instance) => instance.wordWrap,
			triggers: ['change:wordWrap'],
		},
		list_view: {
			type: String,
			protected: true,
			get: (instance) => instance.view,
			triggers: ['change:view'],
		},
	},
})
