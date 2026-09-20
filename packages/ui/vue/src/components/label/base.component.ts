import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { LabelDescriptor } from '@soldy/setup'
import type { ILabel } from '@soldy/core'

export const emitsLabel: TEmits = useEmits(LabelDescriptor())

export const propsLabel: TProps = useProps(LabelDescriptor()) as TProps

export type LabelProps = UseProps<typeof LabelDescriptor, ILabel>

export default {
	name: 'BaseLabel',
	emits: emitsLabel,
	props: propsLabel,
}
