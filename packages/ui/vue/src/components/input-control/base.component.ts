import { BaseValueControl } from '../value-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { InputControlDescriptor } from '@soldy/setup'

export const emitsInputControl: TEmits = useEmits(InputControlDescriptor) as unknown as TEmits

export const propsInputControl: TProps = useProps(InputControlDescriptor) as TProps

export default {
	name: 'BaseInputControl',
	extends: BaseValueControl,
	emits: emitsInputControl,
	props: propsInputControl,
}
