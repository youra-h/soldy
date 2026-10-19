import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { NumberInputDescriptor } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'

export const emitsNumberInput: TEmits = useEmits(NumberInputDescriptor())

export const propsNumberInput: TProps = useProps(NumberInputDescriptor()) as TProps

export type NumberInputProps = UseProps<typeof NumberInputDescriptor, INumberInput>

export default {
	name: 'BaseNumberInput',
	emits: emitsNumberInput,
	props: propsNumberInput,
}
