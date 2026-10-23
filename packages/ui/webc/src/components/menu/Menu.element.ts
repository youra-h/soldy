/**
 * `<span is="so-menu">` — меню действий у кнопки (APG Menu Button) или
 * контекстное меню области. Модуль регистрирует и части меню.
 * docs/architecture.md, Layer 8d, «Меню».
 */

import { MenuCollectionDescriptor, MenuDescriptor } from '@soldy-ui/setup'
import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TMenuCheckboxItemElement } from './checkbox-item'
import { TMenuGroupElement } from './group'
import { TMenuItemElement } from './item'
import { TMenuPopoverItemElement } from './popover-item'
import { TMenuRadioGroupElement } from './radio-group'
import { TMenuRadioItemElement } from './radio-item'
import { TMenuSeparatorElement } from './separator'
import { TMenuSubmenuElement } from './submenu'
import { menuTemplate } from './menu.template'
import { setupMenu } from './setup.component'

export const TMenuElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof MenuDescriptor,
	IMenu,
	TMenuCollectionFacade
> = ElementBase(HTMLSpanElement, {
	descriptor: MenuDescriptor,
	facade: MenuCollectionDescriptor,
	template: menuTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupMenu,
})

defineElement('so-menu', TMenuElement, 'span')
defineElement('so-menu-group', TMenuGroupElement, 'div')
defineElement('so-menu-radio-group', TMenuRadioGroupElement, 'div')
defineElement('so-menu-submenu', TMenuSubmenuElement, 'div')
defineElement('so-menu-item', TMenuItemElement, 'div')
defineElement('so-menu-checkbox-item', TMenuCheckboxItemElement, 'div')
defineElement('so-menu-radio-item', TMenuRadioItemElement, 'div')
defineElement('so-menu-popover-item', TMenuPopoverItemElement, 'div')
defineElement('so-menu-separator', TMenuSeparatorElement, 'div')

export type TMenuElementProps = TElementType<typeof TMenuElement>
