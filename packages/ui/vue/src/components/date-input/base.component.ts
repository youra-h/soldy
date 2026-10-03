import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { DateInputDescriptor } from '@soldy-ui/setup'
import type { IDateInput } from '@soldy-ui/core'

export const emitsDateInput: TEmits = useEmits(DateInputDescriptor())

export const propsDateInput: TProps = useProps(DateInputDescriptor()) as TProps

export type DateInputProps = UseProps<typeof DateInputDescriptor, IDateInput>

export default {
	name: 'BaseDateInput',
	emits: emitsDateInput,
	props: propsDateInput,
}
