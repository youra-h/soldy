import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListItemDescriptor, ListCollectionItemDescriptor } from '@soldy/setup'

export const emitsListItem: TEmits = [
	...useEmits(ListItemDescriptor()),
	...useEmits(ListCollectionItemDescriptor()),
] as unknown as TEmits

export const propsListItem: TProps = {
	...(useProps(ListItemDescriptor()) as TProps),
	...(useProps(ListCollectionItemDescriptor()) as TProps),
}

export default {
	name: 'BaseListItem',
	extends: BaseValueControl,
	emits: emitsListItem,
	props: propsListItem,
}
