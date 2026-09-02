import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListBoxDescriptor, ListBoxCollectionDescriptor } from '@soldy/setup'

export const emitsListBox: TEmits = [
	...useEmits(ListBoxDescriptor()),
	...useEmits(ListBoxCollectionDescriptor()),
] as unknown as TEmits

export const propsListBox: TProps = {
	...(useProps(ListBoxDescriptor()) as TProps),
	...(useProps(ListBoxCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseListBox',
	extends: BaseControl,
	emits: emitsListBox,
	props: propsListBox,
}
