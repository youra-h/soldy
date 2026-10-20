import type { IPaginationItem } from '@soldy-ui/core'
import type { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События страницы — свои (ядро и плагины) и фасада элемента коллекции. */
export type PaginationItemEventProps = EventProps<typeof PaginationItemDescriptor> &
	EventProps<typeof PaginationCollectionItemDescriptor>

/**
 * Пропсы страницы. Ставит её только пагинация — инстансом из окна (`ctrl`) и
 * слотом страницы; входов у страницы нет: ключ, текст и наборы ей пишет
 * расширение коллекции, размер и вариант — пагинации.
 */
export type PaginationItemProps = UseDomProps<
	typeof PaginationItemDescriptor,
	IPaginationItem,
	PaginationItemEventProps
>
