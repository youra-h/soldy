/**
 * `<span is="so-check-box">` — флажок с нативным `<input type="checkbox">`
 * внутри; `span` — его кладут в `Label`. docs/architecture.md, Layer 8d, «Поле».
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { checkBoxTemplate } from './check-box.template'
import { setupCheckBox } from './setup.component'

export const TCheckBoxElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof CheckBoxDescriptor,
	ICheckBox
> = ElementBase(HTMLSpanElement, {
	descriptor: CheckBoxDescriptor,
	template: checkBoxTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupCheckBox,
})

defineElement('so-check-box', TCheckBoxElement, 'span')

export type TCheckBoxElementProps = TElementType<typeof TCheckBoxElement>
