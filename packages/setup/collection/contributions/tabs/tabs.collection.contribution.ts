import type { ICollectionContribution } from '@soldy/accessor'

/**
 * Контрибуция коллекции табов.
 *
 * Описывает props и events, которые коллекция Tabs экспонирует наружу:
 * - items (массив элементов) из engine
 * - activeItem (активный элемент) из TActivationExtension
 * - count (количество элементов) из engine
 */
export const TabsCollectionContribution: ICollectionContribution = {
	props: [
		{ name: 'items', source: 'engine', triggers: ['change:items'] },
		{ name: 'activeItem', source: 'activation', triggers: ['change:activation'], protected: true },
		{ name: 'count', source: 'engine', triggers: ['change:count'], protected: true },
	],
	events: [
		'change:items',
		'change:count',
		'reset',
		'item:added',
		'item:removed',
		'item:updated',
		'item:moved',
		'change:activation',
		'item:activated',
		'item:deactivated',
	],
}
