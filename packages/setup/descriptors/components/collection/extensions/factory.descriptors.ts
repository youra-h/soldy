import { TFactoryExtension } from '@soldy/core'
import { FactoryExtensionContribution } from '../../../../contributions'

export const FactoryExtensionDescriptor = ({ itemCtor }) => defineExtension<TItem = object>({
	ctor: TFactoryExtension<TItem>,

	contribution: FactoryExtensionContribution,

	options: {
		itemCtor,
	},
})
