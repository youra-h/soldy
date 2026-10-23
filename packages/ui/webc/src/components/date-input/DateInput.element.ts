/**
 * `<div is="so-date-input">` — поле даты из частей по формату локали. Корень —
 * группа частей (`role="group"`), своего `<input>` нет, и атрибуты потребителя
 * остаются на корне; значение для формы — скрытое поле. docs/architecture.md,
 * Layer 8d, «Даты».
 */

import { DateInputDescriptor } from '@soldy-ui/setup'
import type { IDateInput } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { dateInputTemplate } from './date-input.template'
import { setupDateInput } from './setup.component'

export const TDateInputElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof DateInputDescriptor,
	IDateInput
> = ElementBase(HTMLDivElement, {
	descriptor: DateInputDescriptor,
	template: dateInputTemplate,
	setup: setupDateInput,
})

defineElement('so-date-input', TDateInputElement, 'div')

export type TDateInputElementProps = TElementType<typeof TDateInputElement>
