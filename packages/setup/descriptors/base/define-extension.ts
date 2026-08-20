import type { ICollectionExtensionDescriptor } from './types'

/**
 * defineExtension — типизированная фабрика дескриптора расширения коллекции.
 *
 * @example
 * ```ts
 * export const ActivationExtensionDescriptor = defineExtension({
 *   name: 'activation',
 *   ctor: TActivationExtension,
 *   contribution: ActivationExtensionContribution,
 *   itemContribution: ActivationItemExtensionContribution,
 * })
 * ```
 */
export function defineExtension<TItem = object>(
	options: ICollectionExtensionDescriptor<TItem>,
): ICollectionExtensionDescriptor<TItem> {
	return options
}
