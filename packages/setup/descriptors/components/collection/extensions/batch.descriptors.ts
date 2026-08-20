import { TBatchExtension } from '@soldy/core'
import { BatchExtensionContribution } from '../../../../contributions'
import { defineExtension } from '../../../base'

export const BatchExtensionDescriptor = defineExtension({
	name: 'batch',
	ctor: TBatchExtension,
	contribution: BatchExtensionContribution,
})
