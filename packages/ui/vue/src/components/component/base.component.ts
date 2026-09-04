import type { TEmits, TProps, UseProps } from '../../types'
import { useEmits, useProps } from '../../adapter'
import { ComponentDescriptor } from '@soldy/setup'
import type { IComponent } from '@soldy/core'

export const emitsComponent: TEmits = useEmits(ComponentDescriptor()) as unknown as TEmits

export const propsComponent: TProps = useProps(ComponentDescriptor()) as TProps

export type ComponentProps = UseProps<typeof ComponentDescriptor, IComponent>

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
}
