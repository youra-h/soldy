/**
 * `<div is="so-list-box">` — список с выбором.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. На корне — `attrs` и
 * `dataset`, как у Vue и Angular, а набор `aria` — сам список — шаблон кладёт
 * на узел списка внутри корня (`div.so-list-box__list`): рядом с ним в корне
 * стоят шапка и подвал. Узел списка — и остановка Tab (`tabindex="0"` ставит
 * шаблон): клавиатура списка слушает корень, а свои клавиши берёт с этого
 * узла.
 *
 * Узел списка — поле корня (`control` в описании корня), как `<input>` у
 * поля: статические атрибуты разметки, кроме `class`, `style`, `is`, `slot` и
 * входов пропов, база при построении переносит на него. `aria-label` и `id`
 * называют список, а не рамку без роли, `tabindex="-1"` снимает его с
 * остановок Tab. Записанное из кода позже остаётся на корне.
 *
 * Контекстов два — свой и фасада коллекции (`setupListBox`), и пропсы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — атрибуты-входы и свойства того же
 * элемента: дескриптор фасада элемент называет рядом со своим. Движок списка
 * его сборка опускает лифтом своему хосту, и элементы находят его вверх по
 * документу.
 *
 * Модуль регистрирует и части — элемент и группу списка — после списка: при
 * апгрейде разметки элемент, зарегистрированный раньше, собирается раньше, и
 * список уже опустил движок, когда собираются его элементы. Строку элемента — Button на `div`
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
import { TListBoxGroupElement } from './group'
import { listBoxTemplate } from './list-box.template'
import { setupListBox } from './setup.component'

export const TListBoxElement = SoldyElement(HTMLDivElement, {
	descriptor: ListBoxDescriptor(),
	facade: ListBoxCollectionDescriptor(),
	template: listBoxTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupListBox,
})

defineElement('so-list-box', TListBoxElement, 'div')
// Части — после владельца (см. шапку)
defineElement('so-list-box-item', TListBoxItemElement, 'div')
defineElement('so-list-box-group', TListBoxGroupElement, 'div')

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
