/**
 * Пагинация. Страница — внутренняя часть (`PaginationItem`): страницы окна
 * кладёт в коллекцию сама пагинация, в разметку их не ставят, и наружу часть
 * не выходит.
 */

export * from './base.component'
export { setupPagination } from './setup.component'
export { default as Pagination } from './Pagination.svelte'
