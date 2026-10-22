/**
 * `<div is="so-tabs">` — набор вкладок: список табов и панели под ним.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. На корне из наборов
 * ядра `attrs` и `dataset` — выключенный набор тема гасит корнем, вместе с
 * панелями (`data-disabled`). Набор `aria` владельца — это список табов, и на
 * `.so-tabs__list` его кладёт шаблон, а рядом со списком лежат панели.
 *
 * Список табов — поле корня (`control` в описании корня), как `<input>` у
 * поля: статические атрибуты разметки, кроме `class`, `style`, `is`, `slot` и
 * входов пропов, база при построении переносит на него. `aria-label` и `id`
 * называют список, а не корень без роли. Записанное из кода позже остаётся на
 * корне.
 *
 * Контекстов два — свой и фасада коллекции (`setupTabs`), и пропсы фасада
 * (`items`, `engine`, `trackBy`) — атрибуты-входы и свойства того же элемента:
 * дескриптор фасада элемент называет рядом со своим. Движок набора его сборка
 * опускает лифтом своему хосту, и табы и панели находят его вверх по
 * документу.
 *
 * Модуль регистрирует и части набора — таб и панель. Разметку, ожившую при
 * регистрации, база собирает по месту (`deferral.ts`): набор — раньше своих
 * табов, и движок они находят уже опущенным.
 *
 * Разметка вынесена в tabs.template.ts, жизненный цикл — в SoldyElement.
 */

import { TabsCollectionDescriptor, TabsDescriptor } from '@soldy-ui/setup'
import type { ITabs, TTabsCollectionFacade } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { TTabsContentElement } from './content'
import { TTabsItemElement } from './item'
import { setupTabs } from './setup.component'
import { tabsTemplate } from './tabs.template'

export const TTabsElement = SoldyElement(HTMLDivElement, {
	descriptor: TabsDescriptor(),
	facade: TabsCollectionDescriptor(),
	template: tabsTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupTabs,
})

defineElement('so-tabs', TTabsElement, 'div')
defineElement('so-tabs-item', TTabsItemElement, 'div')
defineElement('so-tabs-content', TTabsContentElement, 'div')

/**
 * `<div is="so-tabs">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`items`, `engine`) — без тех, что у `div`
 * уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TTabsElementProps = HTMLDivElement &
	ISoldyElement<ITabs, TTabsCollectionFacade> &
	TSoldyElementProps<typeof TabsDescriptor, HTMLDivElement>
