import type { IContribution } from '@soldy/accessor'

export const FrameLayoutContribution = (): IContribution => ({
	props: {
		styles: {
			protected: true,
			triggers: ['change:styles'],
		},
	},
})
