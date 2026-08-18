import type { ICollectionContribution } from '@soldy/accessor'

export const PlainExtensionContribution: ICollectionContribution = {
	events: [
		'item:add:before',
		'item:added',
		'item:removed',
		'item:updated',
		'item:moved',
		'change:items',
		'change:count',
		'reset',
	],
}
