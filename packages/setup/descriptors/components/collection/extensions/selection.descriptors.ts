import { TSelectionExtension } from '@soldy/core'
import {
	SelectionExtensionContribution,
	SelectionItemExtensionContribution,
} from '../../../../contributions'
import { defineExtension } from '../../../base'

export const SelectionExtensionDescriptor = () =>
	defineExtension({
		name: 'selection',
		ctor: TSelectionExtension,
		contribution: SelectionExtensionContribution(),
		itemContribution: SelectionItemExtensionContribution(),
	})
