import type { IContribution } from '@soldy/accessor'

export const ActivatableCollectionContribution: IContribution = {
	props: [
		{ name: 'activeItem', protected: true, triggers: ['item:activated', 'item:deactivated'] },
	],
	events: ['item:activated', 'item:deactivated', 'change:activeItem'],
}
