/**
 * `<div is="so-date-picker">` — поле даты и календарь в панели, одна дата или
 * диапазон. Корень — якорь панели; набор корня `rootAria` — группа у диапазона,
 * у одной даты `aria` уходит полю. docs/architecture.md, Layer 8d, «Даты».
 */

import { DatePickerDescriptor } from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { datePickerTemplate } from './date-picker.template'
import { setupDatePicker } from './setup.component'

export const TDatePickerElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof DatePickerDescriptor,
	IDatePicker
> = ElementBase(HTMLDivElement, {
	descriptor: DatePickerDescriptor,
	template: datePickerTemplate,
	root: { strategy: 'host', aria: 'rootAria' },
	setup: setupDatePicker,
})

defineElement('so-date-picker', TDatePickerElement, 'div')

/** Пару диапазона DatePicker берёт свойством: атрибут `value` — одна дата. */
export type TDatePickerElementProps = TElementType<typeof TDatePickerElement>
