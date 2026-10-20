import type { ITags } from '@soldy-ui/core'
import type { TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Tags — свои (ядро и плагины) и фасада коллекции: режим и выбор,
 * закрытие, состав, `engine:create`. Контекстов у набора два, и колбэки обоих
 * — пропсы одного компонента.
 */
export type TagsEventProps = EventProps<typeof TagsDescriptor> &
	EventProps<typeof TagsCollectionDescriptor>

/**
 * Пропсы Tags. Коллекционные входы (`engine`, `items`, `mode`, `trackBy`)
 * отдельно не перечислены: они входят в интерфейс пропсов ядра (`ITagsProps`),
 * и тип их несёт дескриптор компонента. Атрибуты потребителя — корня: набор
 * тегов и есть ряд с ролью.
 */
export type TagsProps = UseDomProps<typeof TagsDescriptor, ITags, TagsEventProps>
