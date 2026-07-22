/**
 * @soldy/accessor — точка входа
 *
 * Чистые абстракции: контракты (IPropContribution, IContribution, ...)
 * и TComponentAccessor — единый интерфейс доступа к свойствам/событиям.
 *
 * Конкретные реализации (defineComponent, definePlugin) — в @soldy/setup.
 */

export * from './contract'
export { TComponentAccessor } from './accessor'
export { TDescriptorInspector } from './inspector'
export { track } from './runtime'
