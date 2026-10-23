/**
 * `<div is="so-input">` — текстовое поле: нативный `<input>` внутри, по сторонам
 * — слоты `leading` и `trailing`. docs/architecture.md, Layer 8d, «Поле».
 */

import { InputDescriptor } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { inputTemplate } from './input.template'
import { setupInput } from './setup.component'

export const TInputElement: TElementClassOf<typeof HTMLDivElement, typeof InputDescriptor, IInput> =
	ElementBase(HTMLDivElement, {
		descriptor: InputDescriptor,
		template: inputTemplate,
		root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
		setup: setupInput,
	})

defineElement('so-input', TInputElement, 'div')

export type TInputElementProps = TElementType<typeof TInputElement>
