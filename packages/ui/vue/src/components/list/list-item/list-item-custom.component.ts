import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListItemCustomDescriptor } from '@soldy/setup'

export const emitsListItemCustom: TEmits = useEmits(ListItemCustomDescriptor) as unknown as TEmits

export const propsListItemCustom: TProps = useProps(ListItemCustomDescriptor) as TProps

export default {
	name: 'BaseListItemCustom',
	extends: BaseValueControl,
	emits: emitsListItemCustom,
	props: propsListItemCustom,
}
