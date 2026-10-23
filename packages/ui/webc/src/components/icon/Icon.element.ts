/**
 * `<span is="so-icon">` — иконка: `is` не расширяет `<svg>`, и рисунок роли
 * (свой атрибут `icon`, не проп ядра) — `<svg>` внутри корня. docs/architecture.md,
 * Layer 8d, «Иконка».
 */

import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { iconTemplate } from './icon.template'
import { setupIcon } from './setup.component'

export const TIconElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof IconDescriptor,
	IIcon,
	unknown,
	unknown,
	'icon'
> = ElementBase(HTMLSpanElement, {
	descriptor: IconDescriptor,
	template: iconTemplate,
	attributes: ['icon'],
	setup: setupIcon,
})

defineElement('so-icon', TIconElement, 'span')

export type TIconElementProps = TElementType<typeof TIconElement>
