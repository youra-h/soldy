import type { IContribution } from '@soldy/accessor'

export const ValueControlContribution = (): IContribution => ({
	props: {
		value: { type: [String, Number, Boolean, Object, Array], triggers: ['change:value'] },
		name: { type: String, triggers: ['change:name'] },
	},
	events: ['input', 'input:value'],
})
