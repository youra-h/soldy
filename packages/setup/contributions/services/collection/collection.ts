import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TCollectionService.
 * Описывает свойства и события движка коллекции.
 */
export const CollectionServiceContribution: IContribution = {
	props: [
		{ name: 'items', type: Array, triggers: ['change:items'] },
		{ name: 'count', type: Number, protected: true, triggers: ['change:count'] },
	],
	events: ['item:added', 'item:removed', 'item:updated', 'item:moved', 'reset'],
}
