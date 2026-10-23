/**
 * `<div is="so-menu-radio-group">` — группа меню со своим значением: `value`
 * отмеченного переключателя. Переключатель берёт группу при сборке.
 */

import { MenuRadioGroupDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuRadioGroupTemplate } from './menu-radio-group.template'
import { setupMenuRadioGroup } from './setup.component'

export const TMenuRadioGroupElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuRadioGroupDescriptor,
	IMenuRadioGroup
> = ElementBase(HTMLDivElement, {
	descriptor: MenuRadioGroupDescriptor,
	template: menuRadioGroupTemplate,
	setup: setupMenuRadioGroup,
})

export type TMenuRadioGroupElementProps = TElementType<typeof TMenuRadioGroupElement>
