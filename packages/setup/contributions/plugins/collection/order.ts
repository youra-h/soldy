import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TOrderExtension.
 *
 * Событие change:order — изменение порядка элементов в коллекции.
 */
export const OrderExtensionContribution: IContribution = {
	events: ['change:order'],
}
