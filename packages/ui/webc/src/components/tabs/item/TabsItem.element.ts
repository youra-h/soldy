/**
 * `<div is="so-tabs-item">` — таб; строка внутри — Button с `role="tab"`, поле
 * корня (`control`), кнопка закрытия — рядом. Регистрирует модуль набора.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import { TabsCollectionItemDescriptor, TabsItemDescriptor } from '@soldy-ui/setup'
import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupTabsItem } from './setup.component'
import { tabsItemTemplate } from './tabs-item.template'

export const TTabsItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TabsItemDescriptor,
	ITabsItem,
	TTabsItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TabsItemDescriptor,
	facade: TabsCollectionItemDescriptor,
	template: tabsItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupTabsItem,
})

export type TTabsItemElementProps = TElementType<typeof TTabsItemElement>
