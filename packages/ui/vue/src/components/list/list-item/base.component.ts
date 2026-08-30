import { BaseValueControl } from '../../value-control'
import {
	useEmits,
	useProps,
	useCollectionItemProps,
	useCollectionItemEmits,
} from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListItemDescriptor, ListCollectionDescriptor } from '@soldy/setup'

export const emitsListItem: TEmits = [
	...useEmits(ListItemDescriptor()),
	...useCollectionItemEmits(ListCollectionDescriptor()),
] as unknown as TEmits

export const propsListItem: TProps = {
	...(useProps(ListItemDescriptor()) as TProps),
	...(useCollectionItemProps(ListCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseListItem',
	extends: BaseValueControl,
	emits: emitsListItem,
	props: propsListItem,
}
