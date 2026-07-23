import type { IContribution } from '@soldy/accessor'

export const CheckBoxContribution: IContribution = {
	props: [
		{ name: 'indeterminate', triggers: ['change:indeterminate'] },
		{ name: 'plain', triggers: ['change:plain'] },
	],
}
