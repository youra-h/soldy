import type { TClosedComponent } from '../../../adapter'
import TableRowComponent from './Row.vue'

export * from './base.component'
export { default as BaseTableRow } from './base.component'

export const TableRow: TClosedComponent<typeof TableRowComponent> = TableRowComponent
