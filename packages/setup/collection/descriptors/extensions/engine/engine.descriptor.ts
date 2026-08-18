import { defineCollectionExtension } from '../../base'
import { EngineContribution } from '../../../contributions/extensions/engine'
import { CollectionBaseContribution } from '../../../contributions/base'

/** cn (pass-through) + items + count из engine */
export const EngineExtensionDescriptor = defineCollectionExtension({
	source: 'engine',
	contribution: {
		props: [
			...(CollectionBaseContribution.props ?? []),
			...(EngineContribution.props ?? []),
		],
		events: EngineContribution.events,
	},
})
