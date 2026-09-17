export { normalizeContribution } from './compile-contribution'
export { definePlugin } from './define-plugin'
export { defineComponent } from './define-component'
export { usePlugins, resolveRegisteredPlugins } from './plugin-registry'
export { useExtensions, applyRegisteredExtensions } from './extension-registry'
export type { TExtensionFactory } from './extension-registry'
export { defineTheme, useTheme } from './theme'
export type { ITheme, IThemePlugins, IThemeExtensions } from './theme'
export type {
	IBundleContext,
	IPluginRegistrationOptions,
	IResolvedPlugin,
	TPluginScope,
	TRegisteredPlugin,
} from './plugin-registry'
export { collectDeclaredProps, collectItemProps } from './collect-props'
export type {
	IPluginDefinition,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	TComponentCtor,
	TResolveInstance,
	TDescriptorInstance,
	DescriptorProps,
	DescriptorEvents,
	DescriptorPlugins,
	DescriptorSlots,
	DescriptorAllEvents,
	NamespacedEvents,
	TPluginEventsFrom,
	DescriptorAllProps,
	TPluginPropsFrom,
} from './types'
