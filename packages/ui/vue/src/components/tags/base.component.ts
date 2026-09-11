import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TagsDescriptor, TagsCollectionDescriptor } from '@soldy/setup'
import type { ITags } from '@soldy/core'

export const emitsTags: TEmits = [
	...useEmits(TagsDescriptor()),
	...useEmits(TagsCollectionDescriptor()),
] as unknown as TEmits

export const propsTags: TProps = {
	...(useProps(TagsDescriptor()) as TProps),
	...(useProps(TagsCollectionDescriptor()) as TProps),
}

export type TagsProps = UseProps<typeof TagsDescriptor, ITags>

export default {
	name: 'BaseTags',
	emits: emitsTags,
	props: propsTags,
}
