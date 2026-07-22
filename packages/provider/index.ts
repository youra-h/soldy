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
export { track } from './runtime'
