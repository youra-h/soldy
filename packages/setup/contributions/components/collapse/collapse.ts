import type { IContribution } from '@soldy/accessor'

export const CollapseContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
	events: ['item:disabled', 'item:text', 'item:rendered', 'item:visible', 'item:present'],
})
