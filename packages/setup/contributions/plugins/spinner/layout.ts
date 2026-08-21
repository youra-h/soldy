import type { IContribution } from '@soldy/accessor'

export const SpinnerLayoutContribution: IContribution = {
	props: [
		{
			name: 'styles',
			protected: true,
			triggers: ['change:styles'],
		},
	],
}
