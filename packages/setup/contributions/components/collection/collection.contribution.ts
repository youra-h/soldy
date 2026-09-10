import type { IContribution } from '@soldy/accessor'

/**
 * Общие коллекционные props/events владельца коллекции.
 * Переиспользуется в Tabs, Accordion (и далее List, ListBox, ...).
 */
export const CollectionContribution = (): IContribution => ({
	props: {
		/**
		 * Готовая коллекция снаружи — аналог `ctrl` у компонента.
		 *
		 * Без триггеров: это вход, а не наблюдаемое значение. Собирается
		 * сборщиками ядра (`createEngine` и соседи); чего движку не хватает,
		 * компонент доустановит при привязке.
		 */
		engine: { type: Object },
		items: { type: Array, triggers: ['change:items'] },
		trackBy: { type: Function, triggers: ['change:trackBy'] },
	},
	events: [
		'engine:create',
		'item:add:before',
		'item:added',
		'item:removed',
		'item:updated',
		'item:moved',
		'change:count',
		'reset',
		'items:added',
		'items:removed',
	],
})
