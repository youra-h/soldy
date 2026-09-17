export { normalizeContribution } from './contribution'
export { definePlugin } from './plugin'
export { defineComponent } from './component'
export { defineDescriptor } from './descriptor'
export type {
	IBundleContext,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IPluginDefinition,
	TComponentCtor,
} from './types'
export type {
	DescriptorAllEvents,
	DescriptorAllProps,
	DescriptorEvents,
	DescriptorPlugins,
	DescriptorProps,
	DescriptorSlots,
	NamespacedEvents,
	TDescriptorInstance,
	TPluginEventsFrom,
	TPluginPropsFrom,
	TResolveInstance,
} from './inference.types'
