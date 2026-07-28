import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../../defineType'
import type { IActivatableCollection } from '@soldy/core'

export const ActivatableCollectionContribution: IContribution = {
	props: [
		{
			name: 'activeItem',
			type: defineType<IActivatableCollection>(Object),
			protected: true,
			triggers: ['change:activeItem'],
		},
	],
	events: ['item:activated', 'item:deactivated'],
}
