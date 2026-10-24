/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `contentFit`, `view`, плагин подсветки
 * элемента (клавиатурная навигация) и его `id` в документе.
 *
 * `size`, `variant` и `view` раздаёт список — и только он, поэтому входами
 * разметки они у элемента не объявлены: `size` и `variant` сняты общим
 * фрагментом, `view` объявлен защищённым сразу, как у радио.
 *
 * Строка элемента (`row`) — не проп, а экземпляр, которым владеет элемент, как
 * поле Select: за жизнь элемента он не меняется, и разметка отдаёт его кнопке
 * через `ctrl`.
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
				// Вид строки тоже задаёт список — вход не объявлен
				view: { type: String, protected: true, triggers: ['change:view'] },
			},
		},

		plugins: [
			// Фокус держит строка — опция с `tabindex` от списка, — а корень —
			// обёртка вокруг неё: туда `focused = true` и ставит фокус
			ActionPluginDescriptor.with({ focusTarget: rowIn }),
			ListItemPluginDescriptor,
			// `id` элемента — на него ссылается `aria-activedescendant` узла списка
			OptionIdsPluginDescriptor,
		],
	}),
)
