/**
 * Дескриптор AccordionItem (TAccordionItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement + коллекционные item-пропсы (selected, order, view).
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TAccordionItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const AccordionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionItem,

		extends: ValueControlDescriptor(),

		contribution: {
			props: {
				text: { type: String, triggers: ['change:text'] },
				arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
			},
		},
	}),
)
