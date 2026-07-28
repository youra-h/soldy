import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../../defineType'
import type { IActivatableCollectionItem } from '@soldy/core'

export const ActivatableCollectionContribution: IContribution = {
	props: [
		{
			name: 'activeItem',
			type: defineType<IActivatableCollectionItem>(Object),
			protected: true,
			triggers: ['change:activeItem'],
		},
	],
	events: ['item:activated', 'item:deactivated'],
}
