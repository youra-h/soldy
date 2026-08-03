import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TBatchExtension (сервис коллекции).
 * Массовые события пакетных операций.
 */
export const BatchServiceExtensionContribution: IContribution = {
	events: ['items:added', 'items:removed'],
}
