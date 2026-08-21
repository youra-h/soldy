import type { IContribution } from '@soldy/accessor'

export const IconStylesContribution: IContribution = {
	props: [
		{
			name: '_styles',
			type: Object,
			protected: true,
			get: (instance) => instance.styles,
			triggers: ['change:styles'],
		},
	],
}
