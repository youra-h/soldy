import type { TClosedComponent } from '../../../adapter'
import TableColumnComponent from './Column.vue'

export * from './base.component'
export { default as BaseTableColumn } from './base.component'

export const TableColumn: TClosedComponent<typeof TableColumnComponent> = TableColumnComponent
