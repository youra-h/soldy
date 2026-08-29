import type { IContribution } from '@soldy/accessor'

export const FrameLayoutContribution = (): IContribution => ({
	props: [
		{
			name: 'styles',
			protected: true,
			triggers: ['change:styles'],
		},
	],
})
