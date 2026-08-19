import { TBatchExtension } from '@soldy/core'
import { BatchExtensionContribution } from '../../../../contributions'

export const BatchExtensionDescriptor = defineExtension<TItem = object>({
	ctor: TBatchExtension<TItem>,

	contribution: BatchExtensionContribution,
})
