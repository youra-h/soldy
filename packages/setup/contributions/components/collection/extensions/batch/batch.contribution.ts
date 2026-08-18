import type { ICollectionContribution } from '@soldy/accessor'

export const BatchExtensionContribution: ICollectionContribution = {
	props: [
		{ name: 'items', triggers: ['change:items'] },
		{ name: 'trackBy', triggers: ['change:trackBy'] },
	],
	events: ['items:added', 'items:removed'],
}
