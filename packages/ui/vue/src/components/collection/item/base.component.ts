import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { CollectionItemDescriptor } from '@soldy/setup'

export const emitsCollectionItem: TEmits = useEmits(CollectionItemDescriptor) as unknown as TEmits

export const propsCollectionItem: TProps = useProps(CollectionItemDescriptor) as TProps

export default {
	name: 'BaseCollectionItem',
	emits: emitsCollectionItem,
	props: propsCollectionItem,
}
