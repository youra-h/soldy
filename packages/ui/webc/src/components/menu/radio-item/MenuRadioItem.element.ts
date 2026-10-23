/**
 * `<div is="so-menu-radio-item">` — переключатель меню: отмечается один в своей
 * группе и меню не закрывает. Группа — ближайшая `<div is="so-menu-radio-group">`
 * выше. Корень и строка — как у пункта (`MenuItem.element.ts`).
 */

import { MenuCollectionRadioItemDescriptor, MenuRadioItemDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuRadioItemTemplate } from './menu-radio-item.template'
import { setupMenuRadioItem } from './setup.component'

export const TMenuRadioItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuRadioItemDescriptor,
	IMenuRadioItem,
	TMenuItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuRadioItemDescriptor,
	facade: MenuCollectionRadioItemDescriptor,
	template: menuRadioItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuRadioItem,
})

export type TMenuRadioItemElementProps = TElementType<typeof TMenuRadioItemElement>
