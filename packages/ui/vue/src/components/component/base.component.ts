import { TComponent } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { ComponentContribution } from '@soldy/host'
import { compileComponent } from '@soldy/host'
import { useEmits, useProps } from '../../adapter'

const componentModel = compileComponent([ComponentContribution])

export const emitsComponent: TEmits = useEmits(componentModel) as unknown as TEmits

export const propsComponent: TProps = useProps(componentModel, TComponent) as TProps

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
}
