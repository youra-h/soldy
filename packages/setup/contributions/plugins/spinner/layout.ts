import type { IContribution } from '@soldy/accessor'

export const SpinnerLayoutContribution = (): IContribution => ({
	props: {
		styles: {
			protected: true,
			triggers: ['change:styles'],
		},
	},
})
