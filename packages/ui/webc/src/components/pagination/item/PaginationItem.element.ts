/**
 * `<li is="so-pagination-item">` — страница, внутренняя часть пагинации: события
 * не всплывают, нажатую пагинация сообщает `so:change:value`. Поля в корне нет:
 * `aria` страницы (`aria-current`) шаблон кладёт на строку.
 */

import { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { paginationItemTemplate } from './pagination-item.template'
import { setupPaginationItem } from './setup.component'

export const TPaginationItemElement: TElementClassOf<
	typeof HTMLLIElement,
	typeof PaginationItemDescriptor,
	IPaginationItem,
	TPaginationItemCollectionFacade
> = ElementBase(HTMLLIElement, {
	descriptor: PaginationItemDescriptor,
	facade: PaginationCollectionItemDescriptor,
	template: paginationItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupPaginationItem,
})

/** Входов у страницы нет: всё ей пишет пагинация. */
export type TPaginationItemElementProps = TElementType<typeof TPaginationItemElement>
