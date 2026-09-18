export { normalizeContribution } from './contribution'
export { definePlugin } from './plugin'
export { defineComponent } from './component'
export { defineDescriptor } from './descriptor'
export { defineType } from './prop-type'
export type {
	IBundleContext,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IPluginDefinition,
	TComponentCtor,
	TEmptySlotScope,
	TPropType,
} from './types'
export type {
	DescriptorAllEvents,
	DescriptorAllProps,
	DescriptorEvents,
	DescriptorPluginOutputs,
	DescriptorPlugins,
	DescriptorProps,
	DescriptorSlots,
	NamespacedEvents,
	TDescriptorInstance,
	TPluginEventsFrom,
	TPluginOutputsFrom,
	TPluginPropsFrom,
	TResolveInstance,
} from './inference.types'
