import type { IContribution } from '@soldy/accessor'

export const SkeletonContribution: IContribution = {
	props: [
		{ name: 'shape', triggers: ['change:shape'] },
		{ name: 'animation', triggers: ['change:animation'] },
		{ name: 'width', triggers: ['change:width'] },
		{ name: 'height', triggers: ['change:height'] },
	],
}
