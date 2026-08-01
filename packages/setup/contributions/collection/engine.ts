import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TCollectionEngine.
 * Описывает свойства и события, доступные через движок коллекции.
 */
export const CollectionContribution: IContribution = {
    props: [
        { name: 'items', type: Array, triggers: ['change:items'] },
        { name: 'count', type: Number, triggers: ['change:count'] },
    ],
    events: [
        'item:added',
        'item:removed',
        'item:updated',
        'item:moved',
        'change:items',
        'change:count',
        'reset',
    ],
}
