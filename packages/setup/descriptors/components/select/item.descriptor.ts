/**
 * Дескриптор опции Select (TSelectItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size,
 * variant, ...) и добавляет text.
 *
 * `TListItemPlugin` даёт `listItem_highlighted` — визуальную подсветку при
 * навигации с клавиатуры. Она не то же самое, что выбор: подсветка живёт,
 * только пока панель открыта, и в `value` не попадает.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TSelectItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { ListItemPluginDescriptor } from '../../plugins'

export const SelectItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectItem,

		extends: ValueControlDescriptor(),

		contribution: {
			// Слоты строки те же, что у элементов остальных списков: перед текстом,
			// текст, после текста. Совпадение не случайно — строку рисует один и
			// тот же `Button`
			slots: {
				leading: { description: 'Перед текстом опции' },
				'indicator-icon': {
					scope: { selected: defineType<boolean>(Boolean) },
					description: 'Отметка выбранной опции',
				},
				default: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Содержимое опции. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста опции' },
			},
			props: {
				text: { type: String, triggers: ['change:text'] },
			},
		},

		plugins: [ListItemPluginDescriptor()],
	}),
)
