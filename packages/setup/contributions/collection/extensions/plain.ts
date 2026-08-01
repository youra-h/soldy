// contributions/collection/extensions/plain.ts — контрибуция PlainExtension

import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TPlainExtension.
 * Дублирует события движка для прямого доступа через плагин.
 */
export const PlainExtensionContribution: IContribution = {
    events: [
        'item:added',
        'item:removed',
        'item:updated',
        'item:moved',
    ],
}
