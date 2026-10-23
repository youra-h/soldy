/**
 * `<div is="so-tabs">` — набор вкладок; список табов — поле корня (`control`),
 * панели — рядом с ним, `dataset` — на корне: выключенный набор тема гасит вместе
 * с панелями. Модуль регистрирует таб и панель. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { TabsCollectionDescriptor, TabsDescriptor } from '@soldy-ui/setup'
import type { ITabs, TTabsCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TTabsContentElement } from './content'
import { TTabsItemElement } from './item'
import { setupTabs } from './setup.component'
import { tabsTemplate } from './tabs.template'

export const TTabsElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TabsDescriptor,
	ITabs,
	TTabsCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TabsDescriptor,
	facade: TabsCollectionDescriptor,
	template: tabsTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupTabs,
})

defineElement('so-tabs', TTabsElement, 'div')
defineElement('so-tabs-item', TTabsItemElement, 'div')
defineElement('so-tabs-content', TTabsContentElement, 'div')

export type TTabsElementProps = TElementType<typeof TTabsElement>
