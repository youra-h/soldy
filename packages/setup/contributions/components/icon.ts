import type { IContribution } from '@soldy/accessor'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', triggers: ['change:size'] },
		{ name: 'width', triggers: ['change:width'] },
		{ name: 'height', triggers: ['change:height'] },
	],
}
