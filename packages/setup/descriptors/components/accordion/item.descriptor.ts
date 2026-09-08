/**
 * Дескриптор AccordionItem (TAccordionItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement + коллекционные item-пропсы (selected, order, view).
 */

import { defineComponent } from '../../base'
import { TAccordionItem } from '@soldy/core'
import type { IAccordionItemProps, TAccordionItemEvents } from '@soldy/core'
import { AccordionItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const AccordionItemDescriptor = () =>
	defineComponent<IAccordionItemProps, TAccordionItemEvents>()({
		ctor: TAccordionItem,

		extends: ValueControlDescriptor(),

		contribution: AccordionItemContribution(),
	})
