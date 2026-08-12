import type { ICollectionContribution } from '@soldy/accessor'

/** selectedItems/selectedCount на родительском уровне (Select, ListBox) */
export const SelectionContribution: ICollectionContribution = {
	props: [
		{ name: 'selectedItems', source: 'selection', triggers: ['change:selection'], protected: true },
		{ name: 'selectedCount', source: 'selection', triggers: ['change:selectionCount'], protected: true },
	],
	events: ['change:selection'],
}

/** selected на уровне элемента (ListBoxItem, SelectItem) */
export const SelectionItemContribution: ICollectionContribution = {
	props: [
		{ name: 'selected', source: 'selection', triggers: ['change:selection'] },
	],
}
