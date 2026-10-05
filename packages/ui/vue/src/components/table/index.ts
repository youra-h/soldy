import { withParts } from '@soldy-ui/setup'
import TableComponent from './Table.vue'
import { TableColumn } from './column'
import { TableRow } from './row'

export { default as BaseTable } from './base.component'
export * from './base.component'
export * from './column'
export * from './row'

/**
 * Основная форма — `<Table>`. Части `Table.Column` и `Table.Row` рисует сама
 * таблица — по показанным колонкам и строкам; плоские `TableColumn` и
 * `TableRow` — те же компоненты.
 */
export const Table = withParts(TableComponent, { Column: TableColumn, Row: TableRow })
