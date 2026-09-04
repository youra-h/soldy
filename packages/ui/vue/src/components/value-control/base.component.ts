import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ValueControlDescriptor } from '@soldy/setup'
import type { IValueControl } from '@soldy/core'

export const emitsValueControl: TEmits = useEmits(ValueControlDescriptor()) as unknown as TEmits

export const propsValueControl: TProps = useProps(ValueControlDescriptor()) as TProps

export type ValueControlProps = UseProps<typeof ValueControlDescriptor, IValueControl<any>>

export default {
	name: 'BaseValueControl',
	emits: emitsValueControl,
	props: propsValueControl,
}
