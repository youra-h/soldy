/**
 * `<span is="so-switch">` — переключатель с нативным `<input type="checkbox">`
 * внутри; `span` — его кладут в `Label`. docs/architecture.md, Layer 8d, «Поле».
 */

import { SwitchDescriptor } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { switchTemplate } from './switch.template'
import { setupSwitch } from './setup.component'

export const TSwitchElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof SwitchDescriptor,
	ISwitch
> = ElementBase(HTMLSpanElement, {
	descriptor: SwitchDescriptor,
	template: switchTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupSwitch,
})

defineElement('so-switch', TSwitchElement, 'span')

export type TSwitchElementProps = TElementType<typeof TSwitchElement>
