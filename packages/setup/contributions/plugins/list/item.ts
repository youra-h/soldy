import type { IContribution } from '@soldy/accessor'

export const ListItemPluginContribution = (): IContribution => ({
	props: {
		highlighted: {
			protected: true,
			triggers: ['change:highlighted'],
		},
	},
})
