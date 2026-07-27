import type { IContribution } from '@soldy/accessor'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', type: String, triggers: ['change:size'] },
		{ name: 'width', type: Number, triggers: ['change:width'] },
		{ name: 'height', type: Number, triggers: ['change:height'] },
	],
}
