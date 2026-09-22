import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { InputDescriptor } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'

export const emitsInput: TEmits = useEmits(InputDescriptor())

export const propsInput: TProps = useProps(InputDescriptor()) as TProps

export type InputProps = UseProps<typeof InputDescriptor, IInput>

export default {
	name: 'BaseInput',
	emits: emitsInput,
	props: propsInput,
}
