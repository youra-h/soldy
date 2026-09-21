/**
 * Дескриптор TagsItem (TTagsItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `closable`, `closeLabel`, `closeAria`.
 * Плагина подсветки здесь нет: в отличие от ListBoxItem, по тегам ходит
 * настоящий фокус, а не подсветка. Клавиатура набора — плагин владельца
 * (`TagsKeyboardPluginDescriptor`), остановку Tab пишет коллекция.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTagsItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'

export const TagsItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTagsItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Перед текстом тега' },
				default: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Содержимое тега. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста тега' },
				// Подмена иконки закрытия в одном месте; по умолчанию она берётся из
				// пакета иконок по роли `close` (см. `ICON_ROLES`)
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				// Размер и вид тега задаёт набор: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				/**
				 * Атрибуты кнопки закрытия. Отдельный набор, а не часть `aria`:
				 * `aria` описывает сам тег, а это — кнопка рядом с ним. Набор
				 * живой, как `aria`: имя пишет тег, `tabindex` — коллекция по
				 * режиму выбора, и триггер один — набор сам сообщает, что изменился.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:closeAria'],
				},
			},
		},
	}),
)
