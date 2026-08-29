import type { IContribution } from '@soldy/accessor'

export const SpinnerContribution = (): IContribution => ({
	props: {
		borderWidth: { type: [Number, String], triggers: ['change:borderWidth'] },
	},
})
