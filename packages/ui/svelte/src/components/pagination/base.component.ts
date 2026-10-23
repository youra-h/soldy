import type { IPagination } from '@soldy-ui/core'
import type { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type PaginationEventProps = EventProps<typeof PaginationDescriptor> &
	EventProps<typeof PaginationCollectionDescriptor>

/** Атрибуты — корню, `nav`. */
export type PaginationProps = UseDomProps<
	typeof PaginationDescriptor,
	IPagination,
	PaginationEventProps
>
