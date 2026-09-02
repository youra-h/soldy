import type { IContribution } from '@soldy/accessor'

export const ValueControlContribution: IContribution = {
	props: [
		{ name: 'value', triggers: ['change:value'] },
		{ name: 'name', triggers: ['change:name'] },
	],
	events: ['input', 'input:value'],
}
