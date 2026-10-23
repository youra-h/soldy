/**
 * `<div is="so-menu-popover-item">` — пункт с панелью: строка в меню и своя
 * панель сбоку с любым содержимым (свет в слоте по умолчанию; текст строки —
 * слот `header`). docs/architecture.md, Layer 8d, «Меню».
 */

import { MenuCollectionItemDescriptor, MenuPopoverItemDescriptor } from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuPopoverItemTemplate } from './menu-popover-item.template'
import { setupMenuPopoverItem } from './setup.component'

export const TMenuPopoverItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuPopoverItemDescriptor,
	IMenuPopoverItem,
	TMenuItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuPopoverItemDescriptor,
	facade: MenuCollectionItemDescriptor,
	template: menuPopoverItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuPopoverItem,
})

export type TMenuPopoverItemElementProps = TElementType<typeof TMenuPopoverItemElement>
