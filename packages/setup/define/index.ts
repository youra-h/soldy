export { normalizeContribution } from './contribution'
export { definePlugin, pluginContractOf } from './plugin'
export { defineComponent } from './component'
export { defineDescriptor } from './descriptor'
export { defineType } from './prop-type'
export type {
	IBundleContext,
	IComponentContribution,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IComponentPropDefinition,
	IComponentSlotDefinition,
	IPluginDefinition,
	TComponentCtor,
	TEmptySlotScope,
	TPropType,
	TSlotDefinitions,
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
	TInstanceEventName,
	TInstanceEvents,
	TInstanceProps,
	TMergeSlots,
	TPluginEventsFrom,
	TPluginOutputsFrom,
	TPluginPropsFrom,
	TPublishedEvents,
	TSlotsOf,
} from './inference.types'
