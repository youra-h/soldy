/**
 * `<div is="so-menu-popover-item">` — пункт с панелью: строка пункта в меню и
 * своя панель сбоку с любым содержимым, как `Menu.PopoverItem` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень и строка — как
 * у пункта (`MenuItem.element.ts`): на корне классы, `attrs` и `dataset`, на
 * строке — `aria` пункта (`aria-haspopup="dialog"`), и статические атрибуты
 * разметки база переносит на строку (`control`). Панель — деталь Frame: в
 * `body` её уводит база самого Frame. Содержимое панели — свет элемента в
 * слоте по умолчанию, текст строки — слот `header`.
 *
 * Регистрирует элемент модуль меню, после себя.
 *
 * Разметка вынесена в menu-popover-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { MenuCollectionItemDescriptor, MenuPopoverItemDescriptor } from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuPopoverItemTemplate } from './menu-popover-item.template'
import { setupMenuPopoverItem } from './setup.component'

export const TMenuPopoverItemElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuPopoverItemDescriptor(),
	facade: MenuCollectionItemDescriptor(),
	template: menuPopoverItemTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuPopoverItem,
})

/**
 * `<div is="so-menu-popover-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов — без тех, что у `div` уже есть,
 * и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuPopoverItemElementProps = HTMLDivElement &
	ISoldyElement<IMenuPopoverItem, TMenuItemCollectionFacade> &
	TSoldyElementProps<typeof MenuPopoverItemDescriptor, HTMLDivElement>
