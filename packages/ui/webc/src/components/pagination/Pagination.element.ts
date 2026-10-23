/**
 * `<nav is="so-pagination">` — постраничная навигация: стрелки по краям,
 * между ними — список страниц и пропусков.
 *
 * Элемент — настоящий `<nav>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию, ориентир для
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
 * Модуль регистрирует и страницу. Страница — внутренняя часть: класс её
 * элемента из пакета не выходит.
 *
 * Разметка вынесена в pagination.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { TPaginationItemElement } from './item'
import { paginationTemplate } from './pagination.template'
import { setupPagination } from './setup.component'

export const TPaginationElement = ElementBase(HTMLElement, {
	descriptor: PaginationDescriptor,
	facade: PaginationCollectionDescriptor,
	template: paginationTemplate,
	setup: setupPagination,
})

defineElement('so-pagination', TPaginationElement, 'nav')
defineElement('so-pagination-item', TPaginationItemElement, 'li')

/**
 * `<nav is="so-pagination">` из JS: нативный `nav`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`aria_label`,
 * `engine`) — без тех, что у `nav` уже есть, и без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TPaginationElementProps = TElementType<typeof TPaginationElement>
