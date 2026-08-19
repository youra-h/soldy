import { TUniqueExtension } from '@soldy/core'
import { UniqueExtensionContribution } from '../../../../contributions'

export const UniqueExtensionDescriptor = defineExtension<TItem = object>({
	ctor: TUniqueExtension<TItem>,

	contribution: UniqueExtensionContribution,
})
