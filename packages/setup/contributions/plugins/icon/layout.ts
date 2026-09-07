import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

export const IconLayoutContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
	props: {
		styles: {
			type: Object,
			protected: true,
			triggers: ['change:styles'],
		},
	},
})
