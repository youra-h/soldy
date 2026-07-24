import type { IContribution } from '@soldy/accessor'

export const ActivatableCollectionContribution: IContribution = {
	events: ['item:activated', 'item:deactivated', 'change:activeItem'],
}
