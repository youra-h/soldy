/**
 * `<div is="so-menu-checkbox-item">` — флажок меню: отмечается и меню не
 * закрывает. Отметка — `selected` фасада, выбор коллекции меню в режиме
 * `multiple`. Корень и строка — как у пункта (`MenuItem.element.ts`).
 */

import { MenuCheckboxItemDescriptor, MenuCollectionCheckboxItemDescriptor } from '@soldy-ui/setup'
import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuCheckboxItemTemplate } from './menu-checkbox-item.template'
import { setupMenuCheckboxItem } from './setup.component'

export const TMenuCheckboxItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuCheckboxItemDescriptor,
	IMenuCheckboxItem,
	TMenuItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuCheckboxItemDescriptor,
	facade: MenuCollectionCheckboxItemDescriptor,
	template: menuCheckboxItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuCheckboxItem,
})

export type TMenuCheckboxItemElementProps = TElementType<typeof TMenuCheckboxItemElement>
