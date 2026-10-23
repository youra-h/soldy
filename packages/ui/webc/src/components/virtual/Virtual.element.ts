/**
 * `<so-virtual>` — окно длинных списков: автономный элемент без коробки, у Vue
 * и React своего узла у обёртки нет. Селектор `.panel > .so-list-box` через него
 * не проходит. `enabled` выключают из кода: в разметке значимо наличие атрибута.
 */

import { VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'
import { ElementBase } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { setupVirtual } from './setup.component'
import { virtualTemplate } from './virtual.template'

export const TVirtualElement: TElementClassOf<
	typeof HTMLElement,
	typeof VirtualDescriptor,
	IVirtual
> = ElementBase(HTMLElement, {
	descriptor: VirtualDescriptor,
	template: virtualTemplate,
	setup: setupVirtual,
})

defineAutonomousElement('so-virtual', TVirtualElement)

export type TVirtualElementProps = TElementType<typeof TVirtualElement>
