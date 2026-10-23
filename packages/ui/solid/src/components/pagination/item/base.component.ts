import type { IPaginationItem } from '@soldy-ui/core'
import type { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События страницы — свои и фасада. */
export type PaginationItemEventProps = EventProps<typeof PaginationItemDescriptor> &
	EventProps<typeof PaginationCollectionItemDescriptor>

/** Пропсы страницы: входы ей пишут пагинация и коллекция, своё — только `ctrl` и слот. */
export type PaginationItemProps = UseDomProps<
	typeof PaginationItemDescriptor,
	IPaginationItem,
	PaginationItemEventProps
>
