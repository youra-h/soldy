import type { ICollectionContribution } from '@soldy/accessor'

/** selectedItems/selectedCount на родительском уровне (Select, ListBox) */
export const SelectionContribution: ICollectionContribution = {
	props: [
		{ name: 'selectedItems', protected: true, triggers: ['change:selection'] },
		{ name: 'selectedCount', protected: true, triggers: ['change:selectionCount'] },
	],
	events: ['change:selection'],
}

/** selected на уровне элемента (ListBoxItem, SelectItem) */
export const SelectionItemContribution: ICollectionContribution = {
	props: [
		{ name: 'selected', triggers: ['change:selected'] },
	],
}
