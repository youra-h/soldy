import type { IContribution } from '@soldy/accessor'

export const SpinnerContribution: IContribution = {
	props: [
		{ name: 'size', triggers: ['change:size'] },
		{ name: 'variant', triggers: ['change:variant'] },
		{ name: 'borderWidth', triggers: ['change:borderWidth'] },
	],
}
