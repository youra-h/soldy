/**
 * @soldy/provider — точка входа
 *
 * Чистые абстракции: контракты, интерфейсы провайдеров, TRuntime, TAggregateProvider.
 * Конкретные реализации (TObservingAccessorProvider, defineComponent) — в @soldy/setup.
 */

export * from './contract'
export * from './runtime'
export type { IPluginDefinition, IComponentDescriptorOptions, IComponentDescriptor } from './descriptor/types'
export * from './descriptor'
