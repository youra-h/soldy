import type { IContribution } from '@soldy/accessor'

export const CheckBoxContribution = (): IContribution => ({
	props: {
		indeterminate: { type: Boolean, triggers: ['change:indeterminate'] },
		view: { type: String, triggers: ['change:view'] },
	},
})
