import type { IContribution } from '@soldy/accessor'

export const CheckBoxContribution = (): IContribution => ({
	props: [
		{ name: 'indeterminate', type: Boolean, triggers: ['change:indeterminate'] },
		{ name: 'plain', type: Boolean, triggers: ['change:plain'] },
	],
})
