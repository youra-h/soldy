import type { IContribution } from '@soldy/accessor'

export const CollectionContribution: IContribution = {
	props: [
		{ name: 'items', triggers: ['change:items'] },
	],
	events: [
		'changed',
		'change:count',
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
