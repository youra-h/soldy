import type { IContribution } from '@soldy/provider'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', kind: 'state', triggers: ['change:size'] },
		{ name: 'width', kind: 'state', triggers: ['change:width'] },
		{ name: 'height', kind: 'state', triggers: ['change:height'] },
	],
	events: ['change:size', 'change:width', 'change:height'],
}
