/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `contentFit`, плагин подсветки элемента
 * (клавиатурная навигация) и его `id` в документе.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TListBoxItem } from '@soldy-ui/core'
import { rowIn } from '@soldy-ui/plugins'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'
import {
	ActionPluginDescriptor,
	ListItemPluginDescriptor,
	OptionIdsPluginDescriptor,
} from '../../plugins'

export const ListBoxItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Перед текстом элемента' },
				default: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Содержимое элемента. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста элемента' },
				/**
				 * Подмена отметки выбранного в одном месте; глобально она меняется
				 * пакетом иконок (`useIcons`). Обёртка вокруг слота остаётся за
				 * компонентом: она резервирует место и уносит отметку из дерева
				 * доступности.
				 */
				'indicator-icon': {
					scope: { selected: defineType<boolean>(Boolean) },
					description: 'Отметка выбранного элемента',
				},
			},
			props: {
				// Размер и вид элемента задаёт список: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				contentFit: { type: String, triggers: ['change:contentFit'] },
				/**
				 * Свой `id` строки — вход, а не атрибут, который едет на строку:
				 * на него ссылается `aria-activedescendant` списка, и обе стороны
				 * ведёт плагин `id` элемента. Не задан — `id` от монтирования.
				 */
				id: { type: String, triggers: ['change:id'] },
			},
		},

		plugins: [
			// Фокус держит строка — опция с `tabindex` от списка, — а корень —
			// обёртка вокруг неё: туда `focused = true` и ставит фокус
			ActionPluginDescriptor.with({ focusTarget: rowIn }),
			ListItemPluginDescriptor,
			// `id` элемента — свой или от монтирования: на него ссылается
			// `aria-activedescendant` узла списка
			OptionIdsPluginDescriptor,
		],
	}),
)
