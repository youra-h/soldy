import type { IContribution } from '@soldy/accessor'

export const CollectionContribution: IContribution = {
	props: [
		{
			name: 'items',
			type: Object,
			triggers: ['change:items'],
		},
		{
			name: 'count',
			type: Number,
			triggers: ['change:count'],
		},
	],
	events: [
		'changed',
		'reset',
		'item:added',
		'item:beforeDelete',
		'item:deleted',
		'item:afterDelete',
		'item:beforeMove',
		'item:moved',
		'item:afterMove',
	],
}
