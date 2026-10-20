import type { IPagination } from '@soldy-ui/core'
import type { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Pagination — свои (ядро и плагины) и фасада коллекции: окно.
 * Контекстов у пагинации два, и колбэки обоих — пропсы одного компонента.
 */
export type PaginationEventProps = EventProps<typeof PaginationDescriptor> &
	EventProps<typeof PaginationCollectionDescriptor>

/**
 * Пропсы Pagination. Движок снаружи (`engine`) отдельно не перечислен: он
 * входит в интерфейс пропсов ядра (`IPaginationProps`), и тип его несёт
 * дескриптор компонента.
 */
export type PaginationProps = UseDomProps<
	typeof PaginationDescriptor,
	IPagination,
	PaginationEventProps
>
