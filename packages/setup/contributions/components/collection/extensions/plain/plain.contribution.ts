import type { IContribution } from '@soldy/accessor'

export const PlainExtensionContribution: IContribution = {
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
