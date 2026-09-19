export { normalizeContribution } from './contribution'
export { definePlugin, pluginContractOf } from './plugin'
export { defineComponent } from './component'
export { defineDescriptor } from './descriptor'
export { defineType } from './prop-type'
export type {
	IBundleContext,
	IComponentContract,
	IComponentContribution,
	IComponentDescriptor,
	IComponentOptions,
	IComponentPropDefinition,
	IComponentSlotDefinition,
	IPluginContract,
	IPluginDefinition,
	TComponentCtor,
	TEmptySlotScope,
	TPluginCtor,
	TPropType,
	TSlotDefinitions,
} from './types'
export type {
	DescriptorAllEvents,
	DescriptorAllProps,
	DescriptorEvents,
	DescriptorInstance,
	DescriptorPluginOutputs,
	DescriptorProps,
	DescriptorSlots,
	TContractOf,
	TInstanceEvents,
} from './inference.types'
