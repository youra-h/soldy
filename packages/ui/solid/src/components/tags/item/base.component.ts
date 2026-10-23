import type { ITagsItem } from '@soldy-ui/core'
import type { TagsCollectionItemDescriptor, TagsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События тега — свои (ядро и плагины) и фасада: выбор, порядок, закрываемость. */
export type TagsItemEventProps = EventProps<typeof TagsItemDescriptor> &
	EventProps<typeof TagsCollectionItemDescriptor>

/** Атрибуты тега: класс и стиль — корню, остальное — строке. */
export type TagsItemAttributes = TDomAttributes<typeof TagsItemDescriptor, TagsItemEventProps>

/** Пропсы тега; членство в коллекции (`selected`) несёт интерфейс ядра. */
export type TagsItemProps = UseDomProps<typeof TagsItemDescriptor, ITagsItem, TagsItemEventProps>
