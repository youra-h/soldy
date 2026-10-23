import type { ITableColumn } from '@soldy-ui/core'
import type { TableColumnDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События заголовка колонки. */
export type TableColumnEventProps = EventProps<typeof TableColumnDescriptor>

/** Пропсы заголовка колонки: входов нет — колонки задаются данными таблицы. */
export type TableColumnProps = UseDomProps<
	typeof TableColumnDescriptor,
	ITableColumn,
	TableColumnEventProps
>
