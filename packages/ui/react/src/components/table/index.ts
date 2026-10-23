import { withParts } from '@soldy-ui/setup'
import { Table as TableComponent } from './Table'
import { TableColumn } from './column'
import { TableRow } from './row'

export * from './base.component'
export * from './column'
export * from './row'

export const Table = withParts(TableComponent, { Column: TableColumn, Row: TableRow })
