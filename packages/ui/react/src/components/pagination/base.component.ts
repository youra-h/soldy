import type { IPagination } from '@soldy-ui/core'
import type { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** Колбэки обоих контекстов пагинации — свой и фасада коллекции — пропсы одного компонента. */
export type PaginationEventProps = EventProps<typeof PaginationDescriptor> &
	EventProps<typeof PaginationCollectionDescriptor>

export type PaginationProps = UseDomProps<
	typeof PaginationDescriptor,
	IPagination,
	PaginationEventProps
>
