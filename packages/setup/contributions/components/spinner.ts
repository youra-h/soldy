import type { IContribution } from '@soldy/accessor'

export const SpinnerContribution: IContribution = {
	props: [
		{ name: 'borderWidth', triggers: ['change:borderWidth'] },
	],
}
