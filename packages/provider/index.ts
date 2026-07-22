/**
 * @soldy/provider — точка входа
 *
 * Чистые абстракции: контракты (IPropContribution, IContribution, ...)
 * и ComponentAccessor — единый интерфейс доступа к свойствам/событиям.
 *
 * Конкретные реализации (defineComponent, definePlugin) — в @soldy/setup.
 */

export * from './contract'
export { ComponentAccessor } from './accessor'

// Устаревшие экспорты (для обратной совместимости на время миграции)
export type { IAccessor, IAccessorProvider, IEventProvider, IProvider, TEmitPayload } from './runtime/types'
export { TAggregateProvider } from './runtime/aggregate-provider.class'
export { TRuntime } from './runtime/runtime.class'
export { track } from './runtime/track'
