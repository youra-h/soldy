import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Collapse (выводятся фасадом TCollapseCollectionFacade).
 */
export const CollapseCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента Collapse (выводятся фасадом TCollapseItemCollectionFacade).
 */
export const CollapseCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		view: {
			type: String,
			protected: true,
			get: (instance) => instance.view,
			triggers: ['change:view'],
		},
	},
})
