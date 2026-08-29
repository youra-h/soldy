import type { IContribution } from '@soldy/accessor'

export const CheckBoxContribution = (): IContribution => ({
	props: {
		indeterminate: { type: Boolean, triggers: ['change:indeterminate'] },
		plain: { type: Boolean, triggers: ['change:plain'] },
	},
})
