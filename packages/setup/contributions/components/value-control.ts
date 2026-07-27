import type { IContribution } from '@soldy/accessor'

export const ValueControlContribution: IContribution = {
	props: [
		{ name: 'value', type: String, triggers: ['change:value'] },
		{ name: 'name', type: String, triggers: ['change:name'] },
	],
	events: ['input', 'input:value'],
}
