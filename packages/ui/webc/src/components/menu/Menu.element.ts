/**
 * `<span is="so-menu">` — меню действий у кнопки (APG Menu Button) или
 * контекстное меню области.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Строчный корень —
 * обёртка триггера и якорь панели, как у Popover: меню встаёт и в строку
 * текста, и в ряд кнопок. Панель — деталь Frame: в `body` её уводит база самого
 * Frame, на месте в корне остаётся якорь-комментарий, поэтому в корне лежит
 * только триггер, и прямоугольник корня — прямоугольник триггера.
 *
 * Триггер — элемент потребителя в слоте `trigger`:
 * `<span is="so-menu"><button is="so-button" slot="trigger" text="Действия"></button>…</span>`.
 * Связку с меню (`aria-haspopup`, `aria-expanded`, `id`, `aria-controls`) и вид
 * «нажат» (`data-selected`) он получает сам — шаблон кладёт их на первый
 * элемент слота: scope у слотов нет. У контекстного меню
 * (`open-on="contextmenu"`) в слоте — область, и связки у неё нет.
 *
 * Пункты — свет меню в слоте по умолчанию: пункты, флажки, группы
 * переключателей, подменю, пункты с панелью, группы и разделители, — или
 * данные (`el.items`, `el.engine`). На корне из наборов ядра — `attrs` и
 * `dataset` (`data-open`): ARIA у панели и у триггера.
 *
 * Контекстов два — свой и фасада коллекции (`setupMenu`), и пропсы фасада
 * (`items`, `engine`, `trackBy`, `groups`, `groupBy`) — атрибуты-входы и
 * свойства того же элемента: дескриптор фасада элемент называет рядом со
 * своим.
 *
 * Модуль регистрирует и части — после меню: при апгрейде разметки элемент,
 * зарегистрированный раньше, собирается раньше, и меню уже опустило движок,
 * когда собираются его части. Группы — раньше пунктов: пункт в группе берёт
 * при сборке её ключ, а переключатель — саму группу переключателей. Подменю —
 * после групп и раньше остальных пунктов: его пункты входят в его коллекцию, и
 * подменю должно успеть опустить свой движок, а подменю в группе меню берёт её
 * ключ. Строку пунктов — Button на `div` (`<div is="so-button-div">`) —
 * регистрирует фабрика кнопки там, где она впервые нужна, — модуль строки
 * пункта (`row.ts`).
 *
 * Разметка вынесена в menu.template.ts, жизненный цикл — в SoldyElement.
 */

import { MenuCollectionDescriptor, MenuDescriptor } from '@soldy-ui/setup'
import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { TMenuCheckboxItemElement } from './checkbox-item'
import { TMenuGroupElement } from './group'
import { TMenuItemElement } from './item'
import { TMenuPopoverItemElement } from './popover-item'
import { TMenuRadioGroupElement } from './radio-group'
import { TMenuRadioItemElement } from './radio-item'
import { TMenuSeparatorElement } from './separator'
import { TMenuSubmenuElement } from './submenu'
import { menuTemplate } from './menu.template'
import { setupMenu } from './setup.component'

export const TMenuElement = SoldyElement(HTMLSpanElement, {
	descriptor: MenuDescriptor(),
	facade: MenuCollectionDescriptor(),
	template: menuTemplate,
	root: { sets: ['attrs', 'dataset'] },
	setup: setupMenu,
})

defineElement('so-menu', TMenuElement, 'span')
// Части — после владельца, группы — раньше пунктов, подменю — раньше
// остальных пунктов (см. шапку)
defineElement('so-menu-group', TMenuGroupElement, 'div')
defineElement('so-menu-radio-group', TMenuRadioGroupElement, 'div')
defineElement('so-menu-submenu', TMenuSubmenuElement, 'div')
defineElement('so-menu-item', TMenuItemElement, 'div')
defineElement('so-menu-checkbox-item', TMenuCheckboxItemElement, 'div')
defineElement('so-menu-radio-item', TMenuRadioItemElement, 'div')
defineElement('so-menu-popover-item', TMenuPopoverItemElement, 'div')
defineElement('so-menu-separator', TMenuSeparatorElement, 'div')

/**
 * `<span is="so-menu">` из JS: нативный `span`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`items`, `engine`) — без тех, что у `span`
 * уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuElementProps = HTMLSpanElement &
	ISoldyElement<IMenu, TMenuCollectionFacade> &
	TSoldyElementProps<typeof MenuDescriptor, HTMLSpanElement>
