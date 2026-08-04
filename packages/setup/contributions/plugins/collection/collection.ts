import type { IContribution } from '@soldy/accessor'

/**
 * Базовая контрибуция TCollectionPlugin.
 *
 * Описывает:
 * - props: items (readonly массив), count (количество элементов)
 * - events: события из engine (item:added, item:removed и т.д.)
 *
 * События расширений (batch, selection) добавляются отдельно
 * через соответствующие contributions.
 */
export const CollectionContribution: IContribution = {
	props: [
		{ name: 'items', type: Array, protected: true, triggers: ['change:items'] },
		{ name: 'count', type: Number, protected: true, triggers: ['change:count'] },
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
