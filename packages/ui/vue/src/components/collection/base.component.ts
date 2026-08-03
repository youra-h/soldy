import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
// import { CollectionDescriptor } from '@soldy/setup'

export const emitsCollection: TEmits = useEmits({ events: [], props: [] } as TEmits) as unknown as TEmits

export const propsCollection: TProps = useProps({ ctor: Object, props: [] }) as TProps

export default {
	name: 'BaseCollection',
	emits: emitsCollection,
	props: propsCollection,
}
