import { TFactoryExtension } from '@soldy/core'
import { FactoryExtensionContribution } from '../../../../contributions'

export const FactoryExtensionDescriptor =  defineExtension<TItem = object>({
	ctor: TFactoryExtension<TItem>,

	contribution: FactoryExtensionContribution,

	options: {
		itemCtor,
	},
})
