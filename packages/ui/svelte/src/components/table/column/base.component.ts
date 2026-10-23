import type { ITableColumn } from '@soldy-ui/core'
import type { TableColumnDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type TableColumnEventProps = EventProps<typeof TableColumnDescriptor>

/** Входов нет: колонки задаются данными таблицы (`columns`). */
export type TableColumnProps = UseDomProps<
	typeof TableColumnDescriptor,
	ITableColumn,
	TableColumnEventProps
>
