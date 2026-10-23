/**
 * `<div is="so-field">` — поле формы: подпись, контрол, подсказка и ошибка.
 * Своих состояний нет: выключенность и прочее тема читает с корня контрола.
 * docs/architecture.md, Layer 8d, «Поле формы».
 */

import { FieldDescriptor } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { fieldTemplate } from './field.template'
import { setupField } from './setup.component'

export const TFieldElement: TElementClassOf<typeof HTMLDivElement, typeof FieldDescriptor, IField> =
	ElementBase(HTMLDivElement, {
		descriptor: FieldDescriptor,
		template: fieldTemplate,
		setup: setupField,
	})

defineElement('so-field', TFieldElement, 'div')

export type TFieldElementProps = TElementType<typeof TFieldElement>
