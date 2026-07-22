/**
 * defineComponent / definePlugin — фабрики дескрипторов компонентов.
 *
 * Перенесено из @soldy/provider: использует TPluginBundle из @soldy/plugins.
 * В @soldy/provider остаются только интерфейсы (IComponentDescriptor и др.).
 */

import type {
	IPluginDefinition,
	IComponentDefinition,
	IPluginDefinitionOptions,
	IComponentDefinitionOptions,
} from './types'

// --- definePlugin ---

export function definePlugin(options: IPluginDefinitionOptions): IPluginDefinition {}

// --- defineComponent ---

export function defineComponent(options: IComponentDefinitionOptions): IComponentDefinition {}
