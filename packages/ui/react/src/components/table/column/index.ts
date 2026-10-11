/**
 * TableColumn — заголовок колонки таблицы на базе TTableColumn.
 */

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTableColumn } from './setup.component'

// 3. View (JSX-шаблон)
export { TableColumn } from './Column'
