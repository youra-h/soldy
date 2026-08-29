import type { IContribution } from '@soldy/accessor'

export const IconContribution = (): IContribution => ({
	props: {
		size: { type: String, triggers: ['change:size'] },
		width: { type: [String, Number], triggers: ['change:width'] },
		height: { type: [String, Number], triggers: ['change:height'] },
	},
})
