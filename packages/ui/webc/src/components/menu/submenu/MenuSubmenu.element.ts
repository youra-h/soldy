/**
 * `<div is="so-menu-submenu">` — пункт с подменю: строка пункта в меню над ним
 * и своя панель с пунктами, как `Menu.Submenu` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень и строка — как
 * у пункта (`MenuItem.element.ts`): на корне классы, `attrs` и `dataset`, на
 * строке — `aria` пункта, и статические атрибуты разметки база переносит на
 * строку (`control`). Панель — деталь Frame: в `body` её уводит база самого
 * Frame, на месте в корне остаётся якорь-комментарий.
 *
 * Контекстов три — свой, фасад пункта и фасад меню своих пунктов
 * (`setupMenuSubmenu`), — и описание элемента называет оба фасада: пропсов у
 * фасада пункта нет, а пропсы своей коллекции (`items`, `engine`, `trackBy`,
 * `groups`, `groupBy`) — атрибуты-входы и свойства того же элемента, как у
 * меню. Пункты — разметкой в его свете или данными (`el.items`, `el.engine`).
 *
 * Пункт в подменю входит в его коллекцию, а пункт с подменю в группе берёт при
 * сборке её ключ. Регистрирует элемент модуль меню, а разметку, ожившую при
 * регистрации, база собирает по месту: подменю — после группы над ним и
 * раньше своих пунктов.
 *
 * Разметка вынесена в menu-submenu.template.ts, жизненный цикл — в
 * ElementBase.
 */

import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { IMenuSubmenu, TMenuCollectionFacade, TMenuItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { menuSubmenuTemplate } from './menu-submenu.template'
import { setupMenuSubmenu } from './setup.component'

export const TMenuSubmenuElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof MenuSubmenuDescriptor,
	IMenuSubmenu,
	TMenuItemCollectionFacade,
	TMenuCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: MenuSubmenuDescriptor,
	facade: MenuCollectionItemDescriptor,
	ownerFacade: MenuSubmenuCollectionDescriptor,
	template: menuSubmenuTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupMenuSubmenu,
})

/**
 * `<div is="so-menu-submenu">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами обоих фасадов) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и своей коллекции (`items`,
 * `engine`) — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TMenuSubmenuElementProps = TElementType<typeof TMenuSubmenuElement>
