import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

export const ListItemPluginContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
	props: {
		highlighted: {
			protected: true,
			triggers: ['change:highlighted'],
		},
	},
})
