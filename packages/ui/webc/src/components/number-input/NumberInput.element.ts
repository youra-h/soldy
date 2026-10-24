/**
 * `<div is="so-number-input">` — поле числа: ввод, кнопки шага и скрытое поле
 * формы с числом. `id` — проп поля (`TIdPlugin`): `el.id` из кода тоже уходит
 * на ввод, а не на корень.
 * docs/architecture.md, Layer 8d, «Поле».
 */

import { NumberInputDescriptor } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { numberInputTemplate } from './number-input.template'
import { setupNumberInput } from './setup.component'

export const TNumberInputElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof NumberInputDescriptor,
	INumberInput
> = ElementBase(HTMLDivElement, {
	descriptor: NumberInputDescriptor,
	template: numberInputTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupNumberInput,
})

defineElement('so-number-input', TNumberInputElement, 'div')

export type TNumberInputElementProps = TElementType<typeof TNumberInputElement>
