/**
 * Table — таблица на базе TTable и коллекции строк Table.
 */

import { withParts } from '@soldy-ui/setup'
import TableComponent from './Table.svelte'
import { TableColumn } from './column'
import { TableRow } from './row'

export * from './base.component'
export { setupTable } from './setup.component'
export * from './column'
export * from './row'

/**
 * Основная форма — `<Table>`. Части `Table.Column` и `Table.Row` рисует сама
 * таблица — по показанным колонкам и строкам; плоские `TableColumn` и
 * `TableRow` — те же компоненты.
 */
export const Table = withParts(TableComponent, { Column: TableColumn, Row: TableRow })
