import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListBoxItemDescriptor } from '@soldy/setup'
import {
	BaseListItem,
} from '../../list/list-item'

export const emitsListBoxItem: TEmits = useEmits(ListBoxItemDescriptor) as unknown as TEmits

export const propsListBoxItem: TProps = useProps(ListBoxItemDescriptor) as TProps

export default {
	name: 'BaseListBoxItem',
	extends: BaseListItem,
	emits: emitsListBoxItem,
	props: propsListBoxItem,
}
