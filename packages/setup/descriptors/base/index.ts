export { normalizeContribution } from './compile-contribution'
export { definePlugin } from './define-plugin'
export { defineComponent } from './define-component'
export { defineExtension } from './define-extension'
export { defineCollection } from './define-collection'
export { collectDeclaredProps, collectItemProps, collectOwnerProps } from './collect-props'
export type {
	IPluginDefinition,
	IComponentDefinitionOptions,
	IComponentDescriptor,
	ICollectionDescriptor,
	ICollectionExtensionDescriptor,
} from './types'
