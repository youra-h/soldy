import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ValueControlDescriptor } from '@soldy/setup'

export const emitsValueControl: TEmits = useEmits(ValueControlDescriptor) as unknown as TEmits

export const propsValueControl: TProps = useProps(ValueControlDescriptor) as TProps

export default {
	name: 'BaseValueControl',
	extends: BaseControl,
	emits: emitsValueControl,
	props: propsValueControl,
}
