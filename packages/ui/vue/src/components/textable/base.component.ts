import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { TextableDescriptor } from '@soldy/setup'

export const emitsTextable: TEmits = useEmits(TextableDescriptor) as unknown as TEmits

export const propsTextable: TProps = useProps(TextableDescriptor) as TProps

export default {
	name: 'BaseTextable',
	extends: BaseControl,
	emits: emitsTextable,
	props: propsTextable,
}
