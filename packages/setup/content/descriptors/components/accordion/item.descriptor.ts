/**
 * Дескриптор AccordionItem (TAccordionItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement + коллекционные item-пропсы (selected, order, view).
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TAccordionItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'

export const AccordionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionItem,

		extends: ValueControlDescriptor(),

		contribution: {
			props: {
				// Размер и вид секции задаёт аккордеон: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
			},
		},
	}),
)
