/**
 * @soldy/accessor — точка входа
 *
 * Чистые абстракции: контракты (IPropContribution, IContribution, ...)
 * и TComponentAccessor — единый интерфейс доступа к свойствам/событиям.
 *
 * Конкретные реализации (defineComponent, definePlugin) — в @soldy/setup.
 */

export * from './contract'
export type { IAccessor } from './accessor.interface'
export { TComponentAccessor } from './component-accessor.class'
export { TCollectionAccessor, TItemContextAccessor } from './collection-accessor.class'
export { TDescriptorInspector } from './descriptor-inspector.class'
