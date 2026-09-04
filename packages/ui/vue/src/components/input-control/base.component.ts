import { BaseValueControl } from '../value-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { InputControlDescriptor } from '@soldy/setup'
import type { IInputControl } from '@soldy/core'

export const emitsInputControl: TEmits = useEmits(InputControlDescriptor()) as unknown as TEmits

export const propsInputControl: TProps = useProps(InputControlDescriptor()) as TProps

export type InputControlProps = UseProps<typeof InputControlDescriptor, IInputControl<string>>

export default {
	name: 'BaseInputControl',
	emits: emitsInputControl,
	props: propsInputControl,
}
