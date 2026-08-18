import { defineCollection } from '../base'
import { TabsFactory } from '@soldy/core'
import type { ITabItem } from '@soldy/core'
import { EngineExtensionDescriptor, ActivationExtensionDescriptor, BatchExtensionDescriptor } from '../extensions'

export const TabsCollectionDescriptor = defineCollection<ITabItem>({
	factory: TabsFactory,
	extensions: [
		EngineExtensionDescriptor,
		ActivationExtensionDescriptor,
		BatchExtensionDescriptor,
	],
})
