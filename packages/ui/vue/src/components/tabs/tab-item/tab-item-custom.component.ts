import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemCustomDescriptor } from '@soldy/setup'

export const emitsTabItemCustom: TEmits = useEmits(TabItemCustomDescriptor) as unknown as TEmits

export const propsTabItemCustom: TProps = useProps(TabItemCustomDescriptor) as TProps

export default {
	name: 'BaseTabItemCustom',
	extends: BaseValueControl,
	emits: emitsTabItemCustom,
	props: propsTabItemCustom,
}
