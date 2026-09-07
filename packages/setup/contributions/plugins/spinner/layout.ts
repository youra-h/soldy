import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

export const SpinnerLayoutContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
	props: {
		styles: {
			protected: true,
			triggers: ['change:styles'],
		},
	},
})
