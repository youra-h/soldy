import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Collapse (выводятся фасадом TCollapseCollectionFacade).
 */
export const CollapseCollectionContribution = (): IContribution => ({
	props: {
		// pass-through готовая коллекция — приходит через конструктор фасада
		engine: { triggers: [], set: () => {} },
		items: { type: Array, triggers: ['change:items'] },
		trackBy: { type: Function, triggers: ['change:trackBy'] },
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
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
	],
})

/**
 * Item-level пропсы элемента Collapse (выводятся фасадом TCollapseItemCollectionFacade).
 */
export const CollapseCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
		collapse_view: { type: String, protected: true, triggers: ['change:collapse_view'] },
	},
})
