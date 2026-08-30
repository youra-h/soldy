import { BaseListItem } from '../../list/list-item'
import {
	useEmits,
	useProps,
	useCollectionItemProps,
	useCollectionItemEmits,
} from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListBoxItemDescriptor, ListBoxCollectionDescriptor } from '@soldy/setup'

export const emitsListBoxItem: TEmits = [
	...useEmits(ListBoxItemDescriptor()),
	...useCollectionItemEmits(ListBoxCollectionDescriptor()),
] as unknown as TEmits

export const propsListBoxItem: TProps = {
	...(useProps(ListBoxItemDescriptor()) as TProps),
	...(useCollectionItemProps(ListBoxCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseListBoxItem',
	extends: BaseListItem,
	emits: emitsListBoxItem,
	props: propsListBoxItem,
}
