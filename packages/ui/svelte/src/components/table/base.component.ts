import type { ITable } from '@soldy-ui/core'
import type { TableCollectionDescriptor, TableDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type TableEventProps = EventProps<typeof TableDescriptor> &
	EventProps<typeof TableCollectionDescriptor>

/** Атрибуты: класс, стиль и `ref` — окну, остальное — `table`. */
export type TableProps = UseDomProps<typeof TableDescriptor, ITable, TableEventProps>
