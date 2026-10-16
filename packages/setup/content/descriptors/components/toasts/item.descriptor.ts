/**
 * Дескриптор тоста (TToastsItem).
 *
 * Наследует `StylableDescriptor` — ради `variant`: цвет тоста выбирает
 * приложение, имена вариантов объявляет тема. Размер тосту не нужен, и вход
 * `size` снят. Добавляет текст, описание, кнопку закрытия, длительность,
 * срочность, своё содержимое (`render`) и набор `closeAria`.
 *
 * Тост приходит из кода (`show`), а не из разметки: частью `Toasts.Item` он
 * не стал (см. «Часть или слот»), и его рисует только регион владельца.
 *
 * Слотов описания нет: имя совпало бы с пропом `description`. Описание —
 * текстом пропа, а разметку кладут в `content`.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TToastsItem } from '@soldy-ui/core'
import { StylableDescriptor } from '../stylable.descriptor'
import { SwipePluginDescriptor, ToastsItemNamesPluginDescriptor } from '../../plugins'

export const ToastsItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TToastsItem,

		extends: StylableDescriptor(),

		contribution: {
			slots: {
				icon: { description: 'Значок тоста — перед текстом. Без слота узла значка нет' },
				default: {
					scope: { text: defineType<string>(String) },
					description: 'Текст тоста. Задано — переопределяет проп text',
				},
				content: {
					description: 'Своё содержимое под текстом. Без слота — render тоста',
				},
				// Подмена иконки закрытия в одном месте; по умолчанию она берётся из
				// пакета иконок по роли `close` (см. `ICON_ROLES`)
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				// Размер тосту не нужен: вход снят. Вариант — вход от `StylableDescriptor`
				size: { protected: true },
				text: { type: String, triggers: ['change:text'] },
				description: { type: String, triggers: ['change:description'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				duration: { type: Number, triggers: ['change:duration'] },
				alert: { type: Boolean, triggers: ['change:alert'] },
				/**
				 * Своё содержимое под текстом. Ядро значение не читает: что это и как
				 * его нарисовать, знает адаптер (во Vue — компонент с пропом `toast`)
				 */
				render: { type: [Object, Function], triggers: ['change:render'] },
				/**
				 * Атрибуты кнопки закрытия. Отдельный набор, а не часть `aria`: `aria`
				 * описывает тост, а это кнопка в нём. Имя от локали пишет плагин имён,
				 * и триггер один — набор сам сообщает, что изменился.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:closeAria'],
				},
			},
		},

		plugins: [
			// Имя крестика от локали, вместе с текстом тоста — с первой отрисовки
			ToastsItemNamesPluginDescriptor,
			// Смахнуть тост к стороне его места. Открытость тоста — `open`
			SwipePluginDescriptor,
		],
	}),
)
