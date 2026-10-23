/**
 * `<nav is="so-pagination">` — постраничная навигация. Имя ей даёт приложение
 * (`aria_label`), а не локаль: что листают, знает только оно. Страницы рисует
 * шаблон, слота по умолчанию нет. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TPaginationItemElement } from './item'
import { paginationTemplate } from './pagination.template'
import { setupPagination } from './setup.component'

export const TPaginationElement: TElementClassOf<
	typeof HTMLElement,
	typeof PaginationDescriptor,
	IPagination,
	TPaginationCollectionFacade
> = ElementBase(HTMLElement, {
	descriptor: PaginationDescriptor,
	facade: PaginationCollectionDescriptor,
	template: paginationTemplate,
	setup: setupPagination,
})

defineElement('so-pagination', TPaginationElement, 'nav')
// Страница — внутренняя часть: регистрирует её модуль пагинации
defineElement('so-pagination-item', TPaginationItemElement, 'li')

export type TPaginationElementProps = TElementType<typeof TPaginationElement>
