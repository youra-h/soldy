/**
 * `<div is="so-list-box">` — список с выбором.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Все наборы ядра — на
 * корне, как у Vue и Angular. Список — сам остановка Tab (`tabindex="0"`
 * ставит шаблон), и его клавиатура слушает корень.
 *
 * Контекстов два — свой и фасада коллекции (`setupListBox`), и пропсы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — атрибуты-входы и свойства того же
 * элемента: дескриптор фасада элемент называет рядом со своим. Движок списка
 * его сборка опускает лифтом своему хосту, и элементы находят его вверх по
 * документу.
 *
 * Модуль регистрирует и элемент списка — после списка: при апгрейде разметки
 * элемент, зарегистрированный раньше, собирается раньше, и список уже опустил
 * движок, когда собираются его элементы. Строку элемента — Button на `div`
 * (`<div is="so-button-div">`) — регистрирует фабрика кнопки там, где она
 * впервые нужна, — модуль шаблона элемента.
 *
 * Разметка вынесена в list-box.template.ts, жизненный цикл — в SoldyElement.
 */

import { ListBoxCollectionDescriptor, ListBoxDescriptor } from '@soldy-ui/setup'
import type { IListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { TListBoxItemElement } from './item'
import { listBoxTemplate } from './list-box.template'
import { setupListBox } from './setup.component'

export const TListBoxElement = SoldyElement(HTMLDivElement, {
	descriptor: ListBoxDescriptor(),
	facade: ListBoxCollectionDescriptor(),
	template: listBoxTemplate,
	setup: setupListBox,
})

defineElement('so-list-box', TListBoxElement, 'div')
// Части — после владельца (см. шапку)
defineElement('so-list-box-item', TListBoxItemElement, 'div')

/**
 * `<div is="so-list-box">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`items`, `mode`,
 * `engine`) — без тех, что у `div` уже есть, и без `HOST_PROPS`
 * (`TSoldyElementProps`).
 */
export type TListBoxElementProps = HTMLDivElement &
	ISoldyElement<IListBox, TListBoxCollectionFacade> &
	TSoldyElementProps<typeof ListBoxDescriptor, HTMLDivElement>
