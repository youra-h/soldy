import type { ITags } from '@soldy-ui/core'
import type { TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Tags — свои и фасада коллекции. */
export type TagsEventProps = EventProps<typeof TagsDescriptor> &
	EventProps<typeof TagsCollectionDescriptor>

/** Пропсы Tags; коллекционные входы несёт интерфейс ядра (`ITagsProps`). */
export type TagsProps = UseDomProps<typeof TagsDescriptor, ITags, TagsEventProps>
