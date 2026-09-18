import { defineComponent, defineDescriptor } from '../../../define'

/**
 * Базовый дескриптор владельца коллекции.
 * Содержит общие props/events (items, trackBy + engine-события).
 * Конкретные коллекции (Tabs, Accordion, ...) наследуют его через `extends`.
 */
export const CollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		/**
		 * Общие коллекционные props/events владельца коллекции.
		 * Переиспользуется во всех пяти коллекциях: Tabs, Accordion, ListBox, Select, Tags.
		 */
		contribution: {
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
				/**
				 * Что показано пользователю — состав после отбора.
				 *
				 * Отдельно от `items`, а не вместо: `items` остаётся реальным составом
				 * хранилища. Про фильтры здесь не знает никто — расширение помечает
				 * выборку устаревшей, коллекция шлёт `change:shown`.
				 */
				shown: { type: Array, protected: true, triggers: ['change:shown'] },
				trackBy: { type: Function, triggers: ['change:trackBy'] },
			},
			events: [
				'engine:create',
				'item:add:before',
				'item:added',
				'item:remove:before',
				'item:removed',
				'item:update:before',
				'item:updated',
				'item:move:before',
				'item:moved',
				'items:clear:before',
				'change:count',
				'reset',
				'items:added',
				'items:removed',
				'change:shown',
			],
		},
	}),
)
