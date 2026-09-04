import { ComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { InteractiveDescriptor } from '@soldy/setup'
import type { IInteractive } from '@soldy/core'

export const emitsInteractive: TEmits = useEmits(InteractiveDescriptor()) as unknown as TEmits

export const propsInteractive: TProps = useProps(InteractiveDescriptor()) as TProps

export type InteractiveProps = UseProps<typeof InteractiveDescriptor, IInteractive>

export default {
	name: 'BaseInteractive',
	emits: emitsInteractive,
	props: propsInteractive,
}
