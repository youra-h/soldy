import type { IContribution } from '@soldy/accessor'

export const BatchExtensionContribution = (): IContribution => ({
	props: {
		items: { triggers: ['change:items'] },
		trackBy: { triggers: ['change:trackBy'] },
	},
	events: ['items:added', 'items:removed'],
})
