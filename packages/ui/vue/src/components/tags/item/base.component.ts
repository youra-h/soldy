import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TagsItemDescriptor, TagsCollectionItemDescriptor } from '@soldy/setup'
import type { ITagsItem } from '@soldy/core'

export const emitsTagsItem: TEmits = [
	...useEmits(TagsItemDescriptor()),
	...useEmits(TagsCollectionItemDescriptor()),
] as unknown as TEmits

export const propsTagsItem: TProps = {
	...(useProps(TagsItemDescriptor()) as TProps),
	...(useProps(TagsCollectionItemDescriptor()) as TProps),
}

export type TagsItemProps = UseProps<typeof TagsItemDescriptor, ITagsItem>

export default {
	name: 'BaseTagsItem',
	emits: emitsTagsItem,
	props: propsTagsItem,
}
