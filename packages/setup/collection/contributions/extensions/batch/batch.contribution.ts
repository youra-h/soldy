import type { ICollectionContribution } from '@soldy/accessor'

export const BatchEventsContribution: ICollectionContribution = {
	props: [{ name: 'trackBy', triggers: ['change:trackBy'] }],
	events: ['items:added', 'items:removed'],
}
