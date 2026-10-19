import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TextareaDescriptor } from '@soldy-ui/setup'
import type { ITextarea } from '@soldy-ui/core'

export const emitsTextarea: TEmits = useEmits(TextareaDescriptor())

export const propsTextarea: TProps = useProps(TextareaDescriptor()) as TProps

export type TextareaProps = UseProps<typeof TextareaDescriptor, ITextarea>

export default {
	name: 'BaseTextarea',
	emits: emitsTextarea,
	props: propsTextarea,
}
