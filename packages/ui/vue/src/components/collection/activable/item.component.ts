import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
// import { ActivatableCollectionItemDescriptor } from '@soldy/setup'
import { BaseCollectionItem } from '../item'

export const emitsActivatableCollectionItem: TEmits = useEmits({ events: [], props: [] } as TEmits) as unknown as TEmits

export const propsActivatableCollectionItem: TProps = useProps({ ctor: Object, props: [] }) as TProps

export default {
	name: 'BaseActivatableCollectionItem',
	extends: BaseCollectionItem,
	emits: emitsActivatableCollectionItem,
	props: propsActivatableCollectionItem,
}
