/**
 * `<div is="so-menu-radio-item">` — переключатель меню: пункт, который
 * отмечается один в своей группе, а меню не закрывает.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень и строка — как
 * у пункта (`MenuItem.element.ts`): на корне классы, `attrs` и `dataset`, на
 * строке — `aria` переключателя (`menuitemradio`, `aria-checked`), и
 * статические атрибуты разметки база переносит на строку (`control`).
 *
 * Отметка — `selected` фасада: выбор коллекции меню, атрибут-вход и свойство
 * элемента. Группа — ближайшая `<div is="so-menu-radio-group">` выше: входа под
 * неё нет, её пишет проводка. Регистрирует элемент модуль меню — после группы
 * переключателей: при апгрейде разметки группа успевает опустить себя.
 *
 * Разметка вынесена в menu-radio-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { MenuCollectionRadioItemDescriptor, MenuRadioItemDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuRadioItemTemplate } from './menu-radio-item.template'
import { setupMenuRadioItem } from './setup.component'

export const TMenuRadioItemElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuRadioItemDescriptor(),
	facade: MenuCollectionRadioItemDescriptor(),
	template: menuRadioItemTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuRadioItem,
})

/**
 * `<div is="so-menu-radio-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`selected`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuRadioItemElementProps = HTMLDivElement &
	ISoldyElement<IMenuRadioItem, TMenuItemCollectionFacade> &
	TSoldyElementProps<typeof MenuRadioItemDescriptor, HTMLDivElement>
