/**
 * `<div is="so-tabs-content">` — панель таба, связанного по `value`; стоит в слоте
 * `content` набора — в `default` попала бы в `[role=tablist]`. Неактивная скрыта
 * (`shownBy`). Регистрирует модуль набора. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { TabsCollectionContentDescriptor, TabsContentDescriptor } from '@soldy-ui/setup'
import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupTabsContent } from './setup.component'
import { tabsContentTemplate } from './tabs-content.template'

export const TTabsContentElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TabsContentDescriptor,
	ITabsContent,
	TTabsContentCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TabsContentDescriptor,
	facade: TabsCollectionContentDescriptor,
	template: tabsContentTemplate,
	root: { strategy: 'host', sets: ['attrs', 'aria'], shownBy: 'active' },
	setup: setupTabsContent,
})

export type TTabsContentElementProps = TElementType<typeof TTabsContentElement>
