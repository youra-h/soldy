/**
 * `<div is="so-textarea">` — многострочное поле: нативный `<textarea>` внутри и
 * счётчик под ним. docs/architecture.md, Layer 8d, «Поле».
 */

import { TextareaDescriptor } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { textareaTemplate } from './textarea.template'
import { setupTextarea } from './setup.component'

export const TTextareaElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TextareaDescriptor,
	ITextarea
> = ElementBase(HTMLDivElement, {
	descriptor: TextareaDescriptor,
	template: textareaTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupTextarea,
})

defineElement('so-textarea', TTextareaElement, 'div')

export type TTextareaElementProps = TElementType<typeof TTextareaElement>
