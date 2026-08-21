import type { IContribution } from '@soldy/accessor'

export const FrameLayoutContribution: IContribution = {
	props: [
		{
			name: '_styles',
			protected: true,
			get: (instance) => instance.styles,
			triggers: ['change:styles'],
		},
	],
}
