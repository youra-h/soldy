import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ListBoxDescriptor, ListBoxCollectionDescriptor } from '@soldy/setup'
import type { IListBox } from '@soldy/core'

export const emitsListBox: TEmits = [
	...useEmits(ListBoxDescriptor()),
	...useEmits(ListBoxCollectionDescriptor()),
] as unknown as TEmits

export const propsListBox: TProps = {
	...(useProps(ListBoxDescriptor()) as TProps),
	...(useProps(ListBoxCollectionDescriptor()) as TProps),
}

export type ListBoxProps = UseProps<typeof ListBoxDescriptor, IListBox>

export default {
	name: 'BaseListBox',
	emits: emitsListBox,
	props: propsListBox,
}
