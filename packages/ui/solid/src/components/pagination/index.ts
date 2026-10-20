/**
 * Pagination — постраничная навигация на базе TPagination и её коллекции.
 *
 * Страница — внутренняя часть (`PaginationItem`): страницы окна кладёт в
 * коллекцию сама пагинация, в разметку их не ставят, и наружу часть не
 * выходит.
 */

export * from './base.component'
export { setupPagination } from './setup.component'
export { Pagination } from './Pagination'
