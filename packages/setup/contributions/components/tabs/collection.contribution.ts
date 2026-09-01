import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Tabs (выводятся фасадом TTabsCollectionFacade).
 */
export const TabsCollectionContribution = (): IContribution => ({
	props: {
		activeItem: { type: Object, protected: true, triggers: ['change:activation'] },
	},
	events: ['item:activated', 'item:deactivated', 'item:close'],
})

/**
 * Item-level пропсы элемента Tabs (выводятся фасадом TTabItemCollectionFacade).
 */
export const TabsCollectionItemContribution = (): IContribution => ({
	props: {
		active: { type: Boolean, triggers: ['change:active'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		tab_closable: {
			type: Boolean,
			protected: true,
			get: (instance) => instance.closable,
			triggers: ['change:closable'],
		},
	},
})
