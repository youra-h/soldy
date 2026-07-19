import { TComponent } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { useEmits, useProps } from '../../adapter'
import { ComponentDescriptor } from '@soldy/setup'

export const emitsComponent: TEmits = useEmits(ComponentDescriptor.model) as unknown as TEmits

export const propsComponent: TProps = useProps(ComponentDescriptor.model, TComponent) as TProps

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
}
