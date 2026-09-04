import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TextableDescriptor } from '@soldy/setup'
import type { ITextable } from '@soldy/core'

export const emitsTextable: TEmits = useEmits(TextableDescriptor()) as unknown as TEmits

export const propsTextable: TProps = useProps(TextableDescriptor()) as TProps

export type TextableProps = UseProps<typeof TextableDescriptor, ITextable>

export default {
	name: 'BaseTextable',
	emits: emitsTextable,
	props: propsTextable,
}
