import type { IContribution } from '@soldy/accessor'

export const ValueControlContribution = (): IContribution => ({
	props: [
		{ name: 'value', type: [String, Number, Boolean, Object, Array], triggers: ['change:value'] },
		{ name: 'name', type: String, triggers: ['change:name'] },
	],
	events: ['input', 'input:value'],
})
