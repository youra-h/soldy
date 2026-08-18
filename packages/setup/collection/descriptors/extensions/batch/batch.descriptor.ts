import { defineCollectionExtension } from '../../base'
import { BatchEventsContribution } from '../../../contributions/extensions/batch'

export const BatchExtensionDescriptor = defineCollectionExtension({
	source: 'batch',
	contribution: BatchEventsContribution,
})
