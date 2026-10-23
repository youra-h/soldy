/**
 * `<div is="so-tabs-item">` — таб: корень, внутри строка — Button с
 * `role="tab"` — и кнопка закрытия рядом с ней.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs`, `dataset` и место в коллекции (`order`): ряд табов — флексбокс, и
 * таб стоит по номеру в коллекции. Строка — узел поля корня (`control`):
 * статические атрибуты разметки таба, кроме `class`, `style`, `is`, `slot` и
 * входов пропов, база при построении переносит на неё — `id`, `title`,
 * `aria-label`, `data-*` потребителя стоят на строке, и там они главнее `aria`
 * таба.
 *
 * Пропсы фасада — `active` — тоже атрибут-вход и свойство элемента: дескриптор
 * фасада элемент называет рядом со своим. Регистрирует элемент модуль набора
 * (`Tabs.element.ts`).
 *
 * Разметка вынесена в tabs-item.template.ts, жизненный цикл — в ElementBase.
 */

import { TabsCollectionItemDescriptor, TabsItemDescriptor } from '@soldy-ui/setup'
import { ElementBase } from '../../../adapter'
import type { TElementType } from '../../../adapter'
import { setupTabsItem } from './setup.component'
import { tabsItemTemplate } from './tabs-item.template'

export const TTabsItemElement = ElementBase(HTMLDivElement, {
	descriptor: TabsItemDescriptor,
	facade: TabsCollectionItemDescriptor,
	template: tabsItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupTabsItem,
})

/**
 * `<div is="so-tabs-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`active`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTabsItemElementProps = TElementType<typeof TTabsItemElement>
