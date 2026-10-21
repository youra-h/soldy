/**
 * `<nav is="so-pagination">` — постраничная навигация: стрелки по краям,
 * между ними — список страниц и пропусков.
 *
 * Элемент — настоящий `<nav>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию, ориентир для
 * скринридера. На корне — все три набора ядра, как у Vue: имя ему даёт
 * приложение (`aria_label`, `aria_labelledBy`), а не локаль — что листают,
 * знает только оно.
 *
 * Контекстов два — свой и фасада коллекции (`setupPagination`), и пропсы
 * фасада (`engine`) — атрибуты-входы и свойства того же элемента: дескриптор
 * фасада элемент называет рядом со своим. Страницы окна кладёт в коллекцию
 * расширение пагинации, а рисует шаблон, поэтому слота по умолчанию у
 * пагинации нет. Движок его сборка опускает лифтом своему хосту, и страницы,
 * которые рисует шаблон, находят его вверх по документу.
 *
 * Модуль регистрирует и страницу — после пагинации: элемент,
 * зарегистрированный раньше, собирается раньше, и пагинация уже опустила
 * движок, когда собираются её страницы. Страница — внутренняя часть: класс её
 * элемента из пакета не выходит.
 *
 * Разметка вынесена в pagination.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { TPaginationItemElement } from './item'
import { paginationTemplate } from './pagination.template'
import { setupPagination } from './setup.component'

export const TPaginationElement = SoldyElement(HTMLElement, {
	descriptor: PaginationDescriptor(),
	facade: PaginationCollectionDescriptor(),
	template: paginationTemplate,
	setup: setupPagination,
})

defineElement('so-pagination', TPaginationElement, 'nav')
// Страница — после владельца (см. шапку)
defineElement('so-pagination-item', TPaginationItemElement, 'li')

/**
 * `<nav is="so-pagination">` из JS: нативный `nav`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`aria_label`,
 * `engine`) — без тех, что у `nav` уже есть, и без `HOST_PROPS`
 * (`TSoldyElementProps`).
 */
export type TPaginationElementProps = HTMLElement &
	ISoldyElement<IPagination, TPaginationCollectionFacade> &
	TSoldyElementProps<typeof PaginationDescriptor, HTMLElement>
