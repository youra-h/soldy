/**
 * `<div is="so-tabs-content">` — панель таба. Видна, когда активен связанный
 * по `value` таб.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Стоит в слоте
 * `content` набора (`slot="content"`): слот `default` набора — список табов,
 * `[role=tablist]`, и панель, попав туда, оказалась бы в нём. Классы, `attrs`
 * и `aria` панели раскладывает на корень база; неактивная панель скрыта —
 * описание корня называет выход `active` фасада, без которого корня нет
 * (`shownBy`), — а её содержимое вне документа.
 *
 * Регистрирует элемент модуль набора (`Tabs.element.ts`).
 *
 * Разметка вынесена в tabs-content.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { TabsCollectionContentDescriptor, TabsContentDescriptor } from '@soldy-ui/setup'
import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { setupTabsContent } from './setup.component'
import { tabsContentTemplate } from './tabs-content.template'

export const TTabsContentElement = ElementBase(HTMLDivElement, {
	descriptor: TabsContentDescriptor(),
	facade: TabsCollectionContentDescriptor(),
	template: tabsContentTemplate,
	root: { sets: ['attrs', 'aria'], shownBy: 'active' },
	setup: setupTabsContent,
})

/**
 * `<div is="so-tabs-content">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе с активностью фасада) и свойства пропов
 * дескриптора — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TTabsContentElementProps = HTMLDivElement &
	IElementBase<ITabsContent, TTabsContentCollectionFacade> &
	TElementProps<typeof TabsContentDescriptor, HTMLDivElement>
