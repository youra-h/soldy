import type { IContribution } from '@soldy/provider'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', triggers: ['change:size'] },
		{ name: 'width', triggers: ['change:width'] },
		{ name: 'height', triggers: ['change:height'] },
	],
	events: ['change:size', 'change:width', 'change:height'],
}
