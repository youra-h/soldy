/**
 * `<div is="so-menu-item">` — пункт меню, действие: корень, внутри строка —
 * Button на `div`.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs` и `dataset` — состояние для темы, — а `aria` пункта — на строке.
 * Строка — узел поля корня (`control`): статические атрибуты разметки пункта,
 * кроме `class`, `style`, `is`, `slot` и входов пропов, база при построении
 * переносит на неё — `id`, `title`, `aria-label`, `data-*` потребителя стоят
 * на строке, и там они главнее `aria` пункта, как `controlAttrs` у Vue.
 *
 * Своих пропсов у фасада пункта нет: нажатие шаблон отдаёт item-адаптеру
 * меню через контекст фасада. Регистрирует элемент модуль меню
 * (`Menu.element.ts`), после себя: при апгрейде разметки меню собирается
 * раньше своих пунктов.
 *
 * Разметка вынесена в menu-item.template.ts, жизненный цикл — в SoldyElement.
 */

import { MenuCollectionItemDescriptor, MenuItemDescriptor } from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuItemTemplate } from './menu-item.template'
import { setupMenuItem } from './setup.component'

export const TMenuItemElement = SoldyElement(HTMLDivElement, {
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
 * и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuItemElementProps = HTMLDivElement &
	ISoldyElement<IMenuItem, TMenuItemCollectionFacade> &
	TSoldyElementProps<typeof MenuItemDescriptor, HTMLDivElement>
