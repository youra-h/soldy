import type { IContribution } from '@soldy/accessor'

export const CollectionItemContribution: IContribution = {
	props: [{ name: 'order', type: Number, protected: true, triggers: ['change:order'] }],
	events: ['free'],
}
