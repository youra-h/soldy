import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { InputDescriptor } from '@soldy/setup'
import type { IInput } from '@soldy/core'

export const emitsInput: TEmits = useEmits(InputDescriptor()) as unknown as TEmits

export const propsInput: TProps = useProps(InputDescriptor()) as TProps

export type InputProps = UseProps<typeof InputDescriptor, IInput>

export default {
	name: 'BaseInput',
	emits: emitsInput,
	props: propsInput,
}
