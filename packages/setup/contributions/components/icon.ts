import type { IContribution } from '@soldy/provider'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', mutable: true, triggers: ['change:size'] },
		{ name: 'width', mutable: true, triggers: ['change:width'] },
		{ name: 'height', mutable: true, triggers: ['change:height'] },
	],
	events: ['change:size', 'change:width', 'change:height'],
}
