import type { IPaginationItem } from '@soldy-ui/core'
import type { PaginationCollectionItemDescriptor, PaginationItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События страницы — свои (ядро и плагины) и фасада. */
export type PaginationItemEventProps = EventProps<typeof PaginationItemDescriptor> &
	EventProps<typeof PaginationCollectionItemDescriptor>

/**
 * Пропсы страницы. Входов у страницы нет — ключ, текст, размер, вариант и
 * выключенность ей пишут пагинация и её коллекция, — поэтому из своего она
 * получает только `ctrl` и слот.
 */
export type PaginationItemProps = UseDomProps<
	typeof PaginationItemDescriptor,
	IPaginationItem,
	PaginationItemEventProps
>
