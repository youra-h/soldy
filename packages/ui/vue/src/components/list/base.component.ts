import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListDescriptor, ListCollectionDescriptor } from '@soldy/setup'

export const emitsList: TEmits = [
	...useEmits(ListDescriptor()),
	...useEmits(ListCollectionDescriptor()),
] as unknown as TEmits

export const propsList: TProps = {
	...(useProps(ListDescriptor()) as TProps),
	...(useProps(ListCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseList',
	extends: BaseControl,
	emits: emitsList,
	props: propsList,
}
