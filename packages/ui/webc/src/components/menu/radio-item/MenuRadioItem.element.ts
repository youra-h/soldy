/**
 * `<div is="so-menu-radio-item">` — переключатель меню: пункт, который
 * отмечается один в своей группе, а меню не закрывает.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень и строка — как
 * у пункта (`MenuItem.element.ts`): на корне классы, `attrs` и `dataset`, на
 * строке — `aria` переключателя (`menuitemradio`, `aria-checked`), и
 * статические атрибуты разметки база переносит на строку (`control`).
 *
 * Отметка — `selected` фасада: выбор коллекции меню, атрибут-вход и свойство
 * элемента. Группа — ближайшая `<div is="so-menu-radio-group">` выше: входа под
 * неё нет, её пишет проводка. Регистрирует элемент модуль меню.
 *
 * Разметка вынесена в menu-radio-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { MenuCollectionRadioItemDescriptor, MenuRadioItemDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { menuRadioItemTemplate } from './menu-radio-item.template'
import { setupMenuRadioItem } from './setup.component'

export const TMenuRadioItemElement = ElementBase(HTMLDivElement, {
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
 * что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TMenuRadioItemElementProps = HTMLDivElement &
	IElementBase<IMenuRadioItem, TMenuItemCollectionFacade> &
	TElementProps<typeof MenuRadioItemDescriptor, HTMLDivElement>
