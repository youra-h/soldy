import type { IContribution } from '@soldy/accessor'

/** selectedItems/selectedCount на родительском уровне (Select, ListBox) */
export const SelectionExtensionContribution: IContribution = {
	props: [
		{ name: 'mode', triggers: ['change:mode'] },
		{
			name: '_selected',
			protected: true,
			triggers: ['change:selection'],
			get: (ext) => ext.selected,
		},
	],
}

/** selected на уровне элемента (ListBoxItem, SelectItem) */
export const SelectionItemExtensionContribution: IContribution = {
	props: [{ name: 'selected', triggers: ['change:selected'] }],
}
