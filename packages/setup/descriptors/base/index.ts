export { normalizeContribution } from './compile-contribution'
export { definePlugin } from './define-plugin'
export { defineComponent } from './define-component'
export { collectDeclaredProps, collectItemProps } from './collect-props'
export type {
	IPluginDefinition,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	TDescriptorInstance,
	DescriptorProps,
	DescriptorEvents,
	DescriptorPlugins,
	DescriptorAllEvents,
	PluginDescriptorEvents,
	PluginDescriptorNamespace,
	NamespacedEvents,
	MergeEvents,
	TPluginEventsFrom,
} from './types'
