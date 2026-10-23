import type { ITableColumn } from '@soldy-ui/core'
import type { TableColumnDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type TableColumnEventProps = EventProps<typeof TableColumnDescriptor>

/** Пропсы заголовка колонки: входов нет, рисует таблица над `ctrl`. */
export type TableColumnProps = UseDomProps<
	typeof TableColumnDescriptor,
	ITableColumn,
	TableColumnEventProps
>
