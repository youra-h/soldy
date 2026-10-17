import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { FieldDescriptor } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'

export const emitsField: TEmits = useEmits(FieldDescriptor())

export const propsField: TProps = useProps(FieldDescriptor()) as TProps

export type FieldProps = UseProps<typeof FieldDescriptor, IField>

export default {
	name: 'BaseField',
	emits: emitsField,
	props: propsField,
}
