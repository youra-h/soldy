import { TComponent } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { useEmits, useProps } from '../../adapter'
import { componentModel } from '@soldy/setup'

export const emitsComponent: TEmits = useEmits(componentModel) as unknown as TEmits

export const propsComponent: TProps = useProps(componentModel, TComponent) as TProps

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
}
