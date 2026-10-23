/**
 * `<div is="so-menu-submenu">` — пункт с подменю: строка в меню над ним и своя
 * панель с пунктами. Три контекста — свой, фасад пункта и фасад своей
 * коллекции; пропсы коллекции — входы того же элемента, как у меню.
 * docs/architecture.md, Layer 8d, «Меню».
 */

import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuSubmenuTemplate } from './menu-submenu.template'
import { setupMenuSubmenu } from './setup.component'

export const TMenuSubmenuElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuSubmenuDescriptor,
	IMenuSubmenu,
	TMenuItemCollectionFacade,
	TMenuCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuSubmenuDescriptor,
	facade: MenuCollectionItemDescriptor,
	ownerFacade: MenuSubmenuCollectionDescriptor,
	template: menuSubmenuTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuSubmenu,
})

export type TMenuSubmenuElementProps = TElementType<typeof TMenuSubmenuElement>
