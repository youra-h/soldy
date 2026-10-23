import type { ITableRow } from '@soldy-ui/core'
import type { TableCollectionRowDescriptor, TableRowDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События строки — свои и фасада. */
export type TableRowEventProps = EventProps<typeof TableRowDescriptor> &
	EventProps<typeof TableCollectionRowDescriptor>

/** Пропсы строки: входов нет, рисует таблица над `ctrl`. */
export type TableRowProps = UseDomProps<typeof TableRowDescriptor, ITableRow, TableRowEventProps>
