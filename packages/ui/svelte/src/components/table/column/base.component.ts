import type { ITableColumn } from '@soldy-ui/core'
import type { TableColumnDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События заголовка колонки (ядро и плагины), выведены из дескриптора автоматически. */
export type TableColumnEventProps = EventProps<typeof TableColumnDescriptor>

/**
 * Пропсы заголовка колонки. Входов у части нет: всё своё у колонки объявлено
 * защищённым — колонки задаются данными таблицы (`columns`), а заголовок
 * рисует таблица над экземпляром колонки (`ctrl`).
 */
export type TableColumnProps = UseDomProps<
	typeof TableColumnDescriptor,
	ITableColumn,
	TableColumnEventProps
>
