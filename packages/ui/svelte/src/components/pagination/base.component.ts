import type { IPagination } from '@soldy-ui/core'
import type { PaginationCollectionDescriptor, PaginationDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Pagination — свои (ядро и плагины) и фасада коллекции: смена окна.
 * Контекстов у пагинации два, и колбэки обоих — пропсы одного компонента.
 */
export type PaginationEventProps = EventProps<typeof PaginationDescriptor> &
	EventProps<typeof PaginationCollectionDescriptor>

/**
 * Пропсы Pagination. Коллекционный вход (`engine`) отдельно не перечислен: он
 * входит в интерфейс пропсов ядра (`IPaginationProps`), и тип его несёт
 * дескриптор компонента. Атрибуты — корня, `nav`.
 */
export type PaginationProps = UseDomProps<
	typeof PaginationDescriptor,
	IPagination,
	PaginationEventProps
>
