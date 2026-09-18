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

import { defineComponent, defineDescriptor } from '../../../define'
import { TSelectItem } from '@soldy/core'
import type { ISelectItemProps, TSelectItemEvents } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { ListItemPluginDescriptor } from '../../plugins'
import type { TEmptySlotScope } from '../../../define'

/**
 * Слоты опции — те же три, что у элементов остальных списков: перед текстом,
 * текст, после текста. Совпадение не случайно, строку рисует один и тот же
 * `Button`.
 */
export type TSelectItemSlots = {
	leading: TEmptySlotScope
	default: { text: string; selected: boolean }
	trailing: TEmptySlotScope
	'indicator-icon': { selected: boolean }
}

export const SelectItemDescriptor = defineDescriptor(() =>
	defineComponent<ISelectItemProps, TSelectItemEvents, TSelectItemSlots>()({
		ctor: TSelectItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Перед текстом опции' },
				'indicator-icon': {
					scope: { selected: Boolean },
					description: 'Отметка выбранной опции',
				},
				default: {
					scope: {
						text: String,
						selected: Boolean,
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
