import { defineCollectionExtension } from '../../base'
import { ActivationContribution, ActivationItemContribution } from '../../../contributions/extensions/activation'

/** activeItem для родительской коллекции */
export const ActivationExtensionDescriptor = defineCollectionExtension({
	source: 'activation',
	contribution: ActivationContribution,
})

/** active для элемента коллекции */
export const ActivationItemExtensionDescriptor = defineCollectionExtension({
	source: 'activation',
	contribution: ActivationItemContribution,
})
