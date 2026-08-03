import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
// import { CollectionItemDescriptor } from '@soldy/setup'

export const emitsCollectionItem: TEmits = useEmits({ events: [], props: [] } as TEmits) as unknown as TEmits

export const propsCollectionItem: TProps = useProps({ ctor: Object, props: [] }) as TProps

export default {
	name: 'BaseCollectionItem',
	emits: emitsCollectionItem,
	props: propsCollectionItem,
}
