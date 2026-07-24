import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ActivatableCollectionDescriptor } from '@soldy/setup'
import {
	default as BaseCollection,
	propsCollection,
} from '../base.component'

export const emitsActivatableCollection: TEmits = useEmits(ActivatableCollectionDescriptor) as unknown as TEmits

export const propsActivatableCollection: TProps = {
	...propsCollection,
	...useProps(ActivatableCollectionDescriptor),
} as TProps

export default {
	name: 'BaseActivatableCollection',
	extends: BaseCollection,
	emits: emitsActivatableCollection,
	props: propsActivatableCollection,
}
