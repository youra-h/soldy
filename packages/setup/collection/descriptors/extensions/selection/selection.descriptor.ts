import { defineCollectionExtension } from '../../base'
import { SelectionContribution, SelectionItemContribution } from '../../../contributions/extensions/selection'

/** selectedItems/selectedCount для родительской коллекции */
export const SelectionExtensionDescriptor = defineCollectionExtension({
	source: 'selection',
	contribution: SelectionContribution,
})

/** selected для элемента коллекции */
export const SelectionItemExtensionDescriptor = defineCollectionExtension({
	source: 'selection',
	contribution: SelectionItemContribution,
})
