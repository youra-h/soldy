import type { IContribution } from '@soldy/accessor'

export const SkeletonLayoutContribution = (): IContribution => ({
	props: {
		styles: {
			protected: true,
			triggers: ['change:styles'],
		},
	},
})
