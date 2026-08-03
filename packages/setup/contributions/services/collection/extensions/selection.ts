import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TSelectionExtension (сервис коллекции).
 * События управления выборкой элементов.
 */
export const SelectionServiceExtensionContribution: IContribution = {
	events: ['selection:changed'],
}
