import type { ITags } from '@soldy-ui/core'
import type { TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type TagsEventProps = EventProps<typeof TagsDescriptor> &
	EventProps<typeof TagsCollectionDescriptor>

/** Атрибуты — корню: набор тегов и есть ряд с ролью. */
export type TagsProps = UseDomProps<typeof TagsDescriptor, ITags, TagsEventProps>
