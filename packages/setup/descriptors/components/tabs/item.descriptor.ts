/**
 * Дескриптор TabsItem.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable + коллекционный плагин (active, order).
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TTabsItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TabsItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsItem,

		extends: ValueControlDescriptor(),

		contribution: {
			props: {
				text: { type: String, triggers: ['change:text'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				/**
				 * Имя кнопки закрытия. Отдельный набор, а не часть `aria`: `aria`
				 * описывает сам таб, а это кнопка рядом с ним.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:closeLabel', 'change:text'],
				},
			},
		},
	}),
)
