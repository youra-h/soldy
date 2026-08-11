import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TBatchExtension.
 *
 * События пакетных операций:
 * - items:added — добавление нескольких элементов
 * - items:removed — удаление нескольких элементов
 */
export const BatchExtensionContribution: IContribution = {
	events: ['items:added', 'items:removed'],
}
