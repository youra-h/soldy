import { TSelectionExtension } from '@soldy/core'
import { SelectionExtensionContribution } from '../../../../contributions'

export const SelectionExtensionDescriptor = defineExtension<TItem = object>({
	ctor: TSelectionExtension<TItem>,

	contribution: SelectionExtensionContribution,
})
