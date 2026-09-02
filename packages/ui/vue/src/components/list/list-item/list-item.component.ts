import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListItemDescriptor } from '@soldy/setup'
import {
	default as BaseListItemCustom,
} from './list-item-custom.component'

export const emitsListItem: TEmits = useEmits(ListItemDescriptor) as unknown as TEmits

export const propsListItem: TProps = useProps(ListItemDescriptor) as TProps

export default {
	name: 'BaseListItem',
	extends: BaseListItemCustom,
	emits: emitsListItem,
	props: propsListItem,
}
