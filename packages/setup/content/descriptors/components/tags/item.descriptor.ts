/**
 * Дескриптор TagsItem (TTagsItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `closable`, `closeLabel`, `closeAria`.
 * Плагина подсветки здесь нет: в отличие от ListBoxItem, по тегам ходит
 * настоящий фокус, а не подсветка. Клавиатура набора — плагин владельца
 * (`TagsKeyboardPluginDescriptor`), остановку Tab пишет коллекция.
 *
 * Размер тегу диктует набор, поэтому вход `size` снят. `variant` — вход, в
 * отличие от остальных элементов коллекций (`OWNER_STYLE_PROPS`): вариант у
 * тега свой, и в одном наборе бывают теги разного цвета. Набор его не пишет —
 * тег без своего варианта тема красит вариантом набора.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTagsItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'

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
				// Размер тега задаёт набор: вход снят. Вариант — свой, вход
				// остаётся от `ValueControlDescriptor`
				size: { protected: true },
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
