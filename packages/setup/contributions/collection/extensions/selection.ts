// contributions/collection/extensions/selection.ts — контрибуция SelectionExtension

import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TSelectionExtension.
 * События управления выборкой элементов.
 */
export const SelectionExtensionContribution: IContribution = {
    events: [
        'selection:changed',
    ],
}
