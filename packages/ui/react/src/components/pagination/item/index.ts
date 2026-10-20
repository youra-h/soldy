/**
 * PaginationItem — страница пагинации на базе TPaginationItem и фасада
 * элемента коллекции. Внутренняя часть: наружу пакета не экспортируется.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupPaginationItem } from './setup.component'

// 3. View (JSX-шаблон)
export { PaginationItem } from './Item'
