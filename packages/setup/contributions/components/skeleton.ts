import type { IContribution } from '@soldy/accessor'

export const SkeletonContribution = (): IContribution => ({
	props: {
		shape: { type: String, triggers: ['change:shape'] },
		animation: { type: String, triggers: ['change:animation'] },
		width: { type: [Number, String], triggers: ['change:width'] },
		height: { type: [Number, String], triggers: ['change:height'] },
	},
})
