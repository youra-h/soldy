/**
 * Pagination — постраничная навигация на базе TPagination и коллекции
 * Pagination.
 *
 * Страница — внутренняя часть (`PaginationItem`): страницы окна кладёт в
 * коллекцию сама пагинация, в разметку их не ставят, и наружу пакета часть не
 * выходит.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupPagination } from './setup.component'

// 3. View (JSX-шаблон)
export { Pagination } from './Pagination'
