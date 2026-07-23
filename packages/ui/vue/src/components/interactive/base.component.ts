import { ComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { InteractiveDescriptor } from '@soldy/setup'

export const emitsInteractive: TEmits = useEmits(InteractiveDescriptor) as unknown as TEmits

export const propsInteractive: TProps = useProps(InteractiveDescriptor) as TProps

export default {
	name: 'BaseInteractive',
	extends: ComponentView,
	emits: emitsInteractive,
	props: propsInteractive,
}
