/**
 * Дескриптор ComponentView (TComponentView) — визуальный слой.
 *
 * Наследует ComponentDescriptor и добавляет видимость, тег, направление, наборы
 * `classes`, `aria`, `dataset`, `attrs` и плагины element/ready.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TComponentView } from '@soldy/core'
import { ElementPluginDescriptor, ReadyPluginDescriptor } from '../plugins'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TComponentView,

		extends: ComponentDescriptor(),

		contribution: {
			// Слот по умолчанию есть у любого визуального слоя, поэтому объявлен
			// здесь и наследуется всеми потомками. Button его переопределяет,
			// добавляя scope.
			slots: {
				default: { description: 'Содержимое компонента' },
			},
			props: {
				rendered: { type: Boolean, triggers: ['change:rendered'] },
				visible: { type: Boolean, triggers: ['change:visible'] },
				present: {
					type: Boolean,
					protected: true,
					triggers: ['change:rendered', 'change:visible'],
				},
				tag: { type: [String, Object], triggers: ['change:tag'] },
				direction: { type: String, triggers: ['change:direction'] },
				classes: {
					type: Object,
					protected: true,
					triggers: ['change:classes'],
				},
				/**
				 * Как `classes`: protected-проп, который ядро держит объектом, а шаблон
				 * раскладывает спредом (`v-bind="aria"`). Адаптер читает снимок через
				 * `valueOf()`.
				 *
				 * Объявлен здесь, а не в Control, потому что ARIA нужна и
				 * неинтерактивным слоям: Icon скрывается через `aria-hidden`, Spinner
				 * объявляет себя как `status`.
				 *
				 * Триггер один. Раньше их приходилось перечислять объединением по всей
				 * цепочке наследования (`change:disabled`, `change:tag`, …), потому что
				 * набор вычислялся на лету и знать, что он устарел, было неоткуда.
				 * Теперь набор сам сообщает об изменении.
				 */
				aria: {
					type: Object,
					protected: true,
					triggers: ['change:aria'],
				},
				/**
				 * Парный к `aria` набор — `data-*` для темы.
				 *
				 * Имя `dataset`, а не `data`: во Vue `data` — опция компонента, и проп
				 * с таким именем читался бы в шаблоне двусмысленно. `dataset` вдобавок
				 * ровно то, как этот набор называет сам DOM.
				 */
				dataset: {
					type: Object,
					protected: true,
					triggers: ['change:dataset'],
				},
				/**
				 * Третий набор рядом с `aria`/`dataset` — нативные атрибуты, зависящие
				 * от тега корня (`disabled` у кнопки/поля). Пуст у неинтерактивных
				 * слоёв: пишет в него `TControl`.
				 */
				attrs: {
					type: Object,
					protected: true,
					triggers: ['change:attrs'],
				},
			},
			events: [
				'show',
				'hide',
				'show:before',
				'show:after',
				'hide:before',
				'hide:after',
				'ready',
			],
		},

		plugins: [ElementPluginDescriptor, ReadyPluginDescriptor],
	}),
)
