/**
 * `<div is="so-menu-item">` — пункт меню, действие: корень, внутри строка —
 * Button на `div`.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs` и `dataset` — состояние для темы, — а `aria` пункта — на строке.
 * Строка — узел поля корня (`control`): статические атрибуты разметки пункта,
 * кроме `class`, `style`, `is`, `slot` и входов пропов, база при построении
 * переносит на неё — `id`, `title`, `aria-label`, `data-*` потребителя стоят
 * на строке, и там они главнее `aria` пункта, как `controlAttrs` у Vue.
 *
 * Своих пропсов у фасада пункта нет: нажатие шаблон отдаёт item-адаптеру
 * меню через контекст фасада. Регистрирует элемент модуль меню
 * (`Menu.element.ts`).
 *
 * Разметка вынесена в menu-item.template.ts, жизненный цикл — в ElementBase.
 */

import { MenuCollectionItemDescriptor, MenuItemDescriptor } from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { menuItemTemplate } from './menu-item.template'
import { setupMenuItem } from './setup.component'

export const TMenuItemElement = ElementBase(HTMLDivElement, {
	descriptor: MenuItemDescriptor(),
	facade: MenuCollectionItemDescriptor(),
	template: menuItemTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuItem,
})

/**
 * `<div is="so-menu-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов — без тех, что у `div` уже есть,
 * и без `HOST_PROPS` (`TElementProps`).
 */
export type TMenuItemElementProps = HTMLDivElement &
	IElementBase<IMenuItem, TMenuItemCollectionFacade> &
	TElementProps<typeof MenuItemDescriptor, HTMLDivElement>
