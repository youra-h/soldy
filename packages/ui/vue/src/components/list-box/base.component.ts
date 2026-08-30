import { BaseList } from '../list'
import { useEmits, useProps, useCollectionProps, useCollectionEmits } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListBoxDescriptor, ListBoxCollectionDescriptor } from '@soldy/setup'

export const emitsListBox: TEmits = [
	...useEmits(ListBoxDescriptor()),
	...useCollectionEmits(ListBoxCollectionDescriptor()),
] as unknown as TEmits

export const propsListBox: TProps = {
	...(useProps(ListBoxDescriptor()) as TProps),
	...(useCollectionProps(ListBoxCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseListBox',
	extends: BaseList,
	emits: emitsListBox,
	props: propsListBox,
}
