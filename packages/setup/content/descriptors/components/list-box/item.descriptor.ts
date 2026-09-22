/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `contentFit` и плагин подсветки элемента
 * (клавиатурная навигация).
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TListBoxItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'
import { ListItemPluginDescriptor } from '../../plugins'

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
				 * пакетом иконок (`setIcons`). Обёртка вокруг слота остаётся за
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
			},
		},

		plugins: [ListItemPluginDescriptor],
	}),
)
