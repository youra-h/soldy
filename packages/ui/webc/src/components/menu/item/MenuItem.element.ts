/**
 * `<div is="so-menu-item">` — пункт меню, действие. Корень несёт классы, `attrs`
 * и `dataset`, а `aria` пункта и перенесённые атрибуты разметки — строка, поле
 * корня. docs/architecture.md, Layer 8d, «Меню».
 */

import { MenuCollectionItemDescriptor, MenuItemDescriptor } from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuItemTemplate } from './menu-item.template'
import { setupMenuItem } from './setup.component'

export const TMenuItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuItemDescriptor,
	IMenuItem,
	TMenuItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuItemDescriptor,
	facade: MenuCollectionItemDescriptor,
	template: menuItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuItem,
})

export type TMenuItemElementProps = TElementType<typeof TMenuItemElement>
