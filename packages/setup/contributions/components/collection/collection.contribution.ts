import type { IContribution } from '@soldy/accessor'

/**
 * Общие коллекционные props/events владельца коллекции.
 * Переиспользуется в Tabs, Collapse (и далее List, ListBox, ...).
 */
export const CollectionContribution = (): IContribution => ({
	props: {
		items: { type: Array, triggers: ['change:items'] },
		trackBy: { type: Function, triggers: ['change:trackBy'] },
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
