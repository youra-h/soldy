import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TPlainExtension (сервис коллекции).
 * Дублирует события движка для прямого доступа через расширение.
 */
export const PlainServiceExtensionContribution: IContribution = {
	events: ['item:added', 'item:removed', 'item:updated', 'item:moved'],
}
