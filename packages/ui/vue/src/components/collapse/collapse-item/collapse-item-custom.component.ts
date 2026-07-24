import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { CollapseItemCustomDescriptor } from '@soldy/setup'

export const emitsCollapseItemCustom: TEmits = useEmits(
	CollapseItemCustomDescriptor,
) as unknown as TEmits

export const propsCollapseItemCustom: TProps = useProps(CollapseItemCustomDescriptor) as TProps

export default {
	name: 'BaseCollapseItemCustom',
	extends: BaseValueControl,
	emits: emitsCollapseItemCustom,
	props: propsCollapseItemCustom,
}
