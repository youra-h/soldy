import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { ListBoxItemDescriptor, ListBoxCollectionItemDescriptor } from '@soldy/setup'
import type { IListBoxItem } from '@soldy/core'

export const emitsListBoxItem: TEmits = [
	...useEmits(ListBoxItemDescriptor()),
	...useEmits(ListBoxCollectionItemDescriptor()),
] as unknown as TEmits

export const propsListBoxItem: TProps = {
	...(useProps(ListBoxItemDescriptor()) as TProps),
	...(useProps(ListBoxCollectionItemDescriptor()) as TProps),
}

export type ListBoxItemProps = UseProps<typeof ListBoxItemDescriptor, IListBoxItem>

export default {
	name: 'BaseListBoxItem',
	emits: emitsListBoxItem,
	props: propsListBoxItem,
}
