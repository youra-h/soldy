import type { TClosedComponent } from '../../adapter'
import PaginationComponent from './Pagination.vue'

export { default as BasePagination } from './base.component'
export * from './base.component'

/**
 * Пагинация. Страница — внутренняя часть (`PaginationItem`): страницы окна
 * кладёт в коллекцию сама пагинация, в разметку их не ставят, и наружу часть
 * не выходит.
 */
export const Pagination: TClosedComponent<typeof PaginationComponent> = PaginationComponent
