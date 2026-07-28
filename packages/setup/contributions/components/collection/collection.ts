import type { IContribution } from '@soldy/accessor'
import type { ICollectionItem } from '@soldy/core'
import { defineType } from './../../defineType'

export const CollectionContribution: IContribution = {
	props: [
		{
			name: 'items',
			type: defineType<ICollectionItem[]>(Array),
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
