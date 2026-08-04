import type { IContribution } from '@soldy/accessor'

export const SkeletonContribution: IContribution = {
	props: [
		{ name: 'shape', type: String, triggers: ['change:shape'] },
		{ name: 'animation', type: String, triggers: ['change:animation'] },
		{ name: 'width', type: [Number, String], triggers: ['change:width'] },
		{ name: 'height', type: [Number, String], triggers: ['change:height'] },
	],
}
