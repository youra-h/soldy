import type { IContribution } from '@soldy/accessor'

export const BatchExtensionContribution: IContribution = {
	props: [
		{ name: 'items', triggers: ['change:items'] },
		{ name: 'trackBy', triggers: ['change:trackBy'] },
	],
	events: ['items:added', 'items:removed'],
}
