import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { InputDescriptor } from '@soldy/setup'

export const emitsInput: TEmits = useEmits(InputDescriptor) as unknown as TEmits

export const propsInput: TProps = useProps(InputDescriptor) as TProps

export default {
	name: 'BaseInput',
	extends: BaseInputControl,
	emits: emitsInput,
	props: propsInput,
}
