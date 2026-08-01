// contributions/collection/extensions/batch.ts — контрибуция BatchExtension

import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TBatchExtension.
 * Массовые события пакетных операций.
 */
export const BatchExtensionContribution: IContribution = {
    events: [
        'items:added',
        'items:removed',
    ],
}
