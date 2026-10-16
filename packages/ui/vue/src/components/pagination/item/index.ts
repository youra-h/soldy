import type { TClosedComponent } from '../../../adapter'
import PaginationItemComponent from './Item.vue'

export * from './base.component'
export { default as BasePaginationItem } from './base.component'

/** Страница — внутренняя часть пагинации: наружу пакета не экспортируется. */
export const PaginationItem: TClosedComponent<typeof PaginationItemComponent> =
	PaginationItemComponent
