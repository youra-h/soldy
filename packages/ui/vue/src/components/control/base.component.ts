import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ControlDescriptor } from '@soldy/setup'

export const emitsControl: TEmits = useEmits(ControlDescriptor) as unknown as TEmits

export const propsControl: TProps = useProps(ControlDescriptor) as TProps

export default {
	name: 'BaseControl',
	extends: BaseStylable,
	emits: emitsControl,
	props: propsControl,
}
