import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../../defineType'
import type { IActivatableCollection } from '@soldy/core'

export const ActivatableCollectionContribution: IContribution = {
	props: [
		{
			name: 'activeItem',
			type: defineType<IActivatableCollection>(Object),
			protected: true,
			triggers: ['item:activated', 'item:deactivated'],
		},
	],
	events: ['item:activated', 'item:deactivated', 'change:activeItem'],
}
