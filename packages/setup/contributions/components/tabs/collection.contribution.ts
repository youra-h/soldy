import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Tabs (выводятся фасадом TTabsCollectionFacade).
 */
export const TabsCollectionContribution = (): IContribution => ({
	props: {
		// pass-through готовая коллекция — приходит через конструктор фасада
		engine: { triggers: [], set: () => {} },
		items: { type: Array, triggers: ['change:items'] },
		trackBy: { type: Function, triggers: ['change:trackBy'] },
		activeItem: { type: Object, protected: true, triggers: ['change:activation'] },
	},
	events: [
		'item:add:before',
		'item:added',
		'item:removed',
		'item:updated',
		'item:moved',
		'change:count',
		'reset',
		'items:added',
		'items:removed',
		'item:activated',
		'item:deactivated',
		'item:close',
	],
})

/**
 * Item-level пропсы элемента Tabs (выводятся фасадом TTabItemCollectionFacade).
 */
export const TabsCollectionItemContribution = (): IContribution => ({
	props: {
		active: { type: Boolean, triggers: ['change:active'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		tabs_closable: { type: Boolean, protected: true, triggers: ['change:tabs_closable'] },
	},
})
