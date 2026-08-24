import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../../../defineType'
import type { TSelectionMode } from '@soldy/core'

/** selectedItems/selectedCount на родительском уровне (Select, ListBox) */
export const SelectionExtensionContribution: IContribution = {
	props: [
		{ name: 'mode', type: defineType<TSelectionMode>(String), triggers: ['change:mode'] },
		{
			name: 'selected',
			type: Array,
			protected: true,
			triggers: ['change:selection'],
		},
	],
}

/** selected на уровне элемента (ListBoxItem, SelectItem) */
export const SelectionItemExtensionContribution: IContribution = {
	props: [{ name: 'selected', type: Boolean, triggers: ['change:selected'] }],
}
