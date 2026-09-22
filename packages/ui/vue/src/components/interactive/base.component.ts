import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { InteractiveDescriptor } from '@soldy-ui/setup'
import type { IInteractive } from '@soldy-ui/core'

export const emitsInteractive: TEmits = useEmits(InteractiveDescriptor())

export const propsInteractive: TProps = useProps(InteractiveDescriptor()) as TProps

export type InteractiveProps = UseProps<typeof InteractiveDescriptor, IInteractive>

export default {
	name: 'BaseInteractive',
	emits: emitsInteractive,
	props: propsInteractive,
}
