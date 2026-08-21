import type { IContribution } from '@soldy/accessor'

export const SkeletonLayoutContribution: IContribution = {
	props: [
		{
			name: 'styles',
			protected: true,
			triggers: ['change:styles'],
		},
	],
}
