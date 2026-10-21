/**
 * `<div is="so-menu-checkbox-item">` — флажок меню: пункт, который
 * отмечается, а меню не закрывает.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень и строка — как
 * у пункта (`MenuItem.element.ts`): на корне классы, `attrs` и `dataset`, на
 * строке — `aria` флажка (`menuitemcheckbox`, `aria-checked`), и статические
 * атрибуты разметки база переносит на строку (`control`).
 *
 * Отметка — `selected` фасада: выбор коллекции меню в режиме `multiple`, атрибут-
 * вход и свойство элемента (`el.selected`), и о её смене флажок сообщает
 * `so:change:selected`. Регистрирует элемент модуль меню, после себя.
 *
 * Разметка вынесена в menu-checkbox-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { MenuCheckboxItemDescriptor, MenuCollectionCheckboxItemDescriptor } from '@soldy-ui/setup'
import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuCheckboxItemTemplate } from './menu-checkbox-item.template'
import { setupMenuCheckboxItem } from './setup.component'

export const TMenuCheckboxItemElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuCheckboxItemDescriptor(),
	facade: MenuCollectionCheckboxItemDescriptor(),
	template: menuCheckboxItemTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuCheckboxItem,
})

/**
 * `<div is="so-menu-checkbox-item">` из JS: нативный `div`, своё элемента
 * soldy (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`selected`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuCheckboxItemElementProps = HTMLDivElement &
	ISoldyElement<IMenuCheckboxItem, TMenuItemCollectionFacade> &
	TSoldyElementProps<typeof MenuCheckboxItemDescriptor, HTMLDivElement>
