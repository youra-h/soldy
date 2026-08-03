import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
// import { ActivatableCollectionDescriptor } from '@soldy/setup'
import { default as BaseCollection } from '../base.component'

export const emitsActivatableCollection: TEmits = useEmits(
	{ events: [], props: [] } as TEmits,
) as unknown as TEmits

export const propsActivatableCollection: TProps = useProps(
	{ ctor: Object, props: [] }) as TProps

export default {
	name: 'BaseActivatableCollection',
	extends: BaseCollection,
	emits: emitsActivatableCollection,
	props: propsActivatableCollection,
}
