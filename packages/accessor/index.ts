/**
 * @soldy/accessor — точка входа
 *
 * Концепция: accessor = множество Unit'ов, каждый Unit = {instance, props, events}.
 * Никакого namespace, pluginsMap или collection-специфики.
 */

export * from './contract'
export type { IAccessor } from './accessor.interface'
export { TAccessor } from './accessor.class'
export { TDescriptorInspector } from './descriptor-inspector.class'
