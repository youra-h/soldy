import type { IPaginationItem } from '@soldy-ui/core'
import type { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События страницы — свои (ядро и плагины) и фасада страницы. */
export type PaginationItemEventProps = EventProps<typeof PaginationItemDescriptor> &
	EventProps<typeof PaginationCollectionItemDescriptor>

/**
 * Пропсы страницы. Страница — внутренняя часть пагинации: ставит её только
 * владелец, по одной на страницу окна, и наружу пакета она не выходит.
 */
export type PaginationItemProps = UseDomProps<
	typeof PaginationItemDescriptor,
	IPaginationItem,
	PaginationItemEventProps
>
