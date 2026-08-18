import { defineCollectionExtension } from '../../base'
import { TabsItemExtensionContribution } from '../../../contributions/custom/tabs'

/** closable (resolved) для элемента таба */
export const TabsItemExtensionDescriptor = defineCollectionExtension({
	source: 'tabs',
	contribution: TabsItemExtensionContribution,
})
