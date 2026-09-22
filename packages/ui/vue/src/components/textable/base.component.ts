import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TextableDescriptor } from '@soldy-ui/setup'
import type { ITextable } from '@soldy-ui/core'

export const emitsTextable: TEmits = useEmits(TextableDescriptor())

export const propsTextable: TProps = useProps(TextableDescriptor()) as TProps

export type TextableProps = UseProps<typeof TextableDescriptor, ITextable>

export default {
	name: 'BaseTextable',
	emits: emitsTextable,
	props: propsTextable,
}
