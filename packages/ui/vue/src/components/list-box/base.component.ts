import { BaseList } from '../list'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListBoxDescriptor } from '@soldy/setup'

export const emitsListBox: TEmits = useEmits(ListBoxDescriptor) as unknown as TEmits

export const propsListBox: TProps = useProps(ListBoxDescriptor) as TProps

export default {
	name: 'BaseListBox',
	extends: BaseList,
	emits: emitsListBox,
	props: propsListBox,
}
