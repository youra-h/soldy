import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TActivationExtension.
 *
 * События активации:
 * - change:activation — изменение активного элемента
 * - item:activated — элемент активирован
 * - item:deactivated — элемент деактивирован
 */
export const ActivationExtensionContribution: IContribution = {
	events: ['change:activation', 'item:activated', 'item:deactivated'],
}
