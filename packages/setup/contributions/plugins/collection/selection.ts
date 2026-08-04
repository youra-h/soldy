import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TSelectionExtension.
 *
 * События выделения:
 * - change:selection — изменение набора выделенных элементов
 */
export const SelectionExtensionContribution: IContribution = {
	events: ['change:selection'],
}
