import type { ICollectionContribution } from '@soldy/accessor'

/** selectedItems/selectedCount на родительском уровне (Select, ListBox) */
export const SelectionExtensionContribution: ICollectionContribution = {
	props: [
		{ name: 'mode', triggers: ['change:mode'] },
		{ name: '_selected', protected: true, triggers: ['change:selection'] },
	],
}

/** selected на уровне элемента (ListBoxItem, SelectItem) */
export const SelectionItemExtensionContribution: ICollectionContribution = {
	props: [{ name: 'selected', triggers: ['change:selected'] }],
}
