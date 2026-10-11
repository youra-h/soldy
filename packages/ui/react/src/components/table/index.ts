/**
 * Table — таблица на базе TTable и коллекции строк Table.
 */

import { withParts } from '@soldy-ui/setup'
import { Table as TableComponent } from './Table'
import { TableColumn } from './column'
import { TableRow } from './row'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupTable } from './setup.component'

// 3. Части
export * from './column'
export * from './row'

/**
 * Основная форма — `<Table>`. Части `Table.Column` и `Table.Row` рисует сама
 * таблица — по показанным колонкам и строкам; плоские `TableColumn` и
 * `TableRow` — те же компоненты.
 */
export const Table = withParts(TableComponent, { Column: TableColumn, Row: TableRow })
