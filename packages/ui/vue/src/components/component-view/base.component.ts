import type { TEmits, TProps } from '../../types'
import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import { TComponentView } from '@soldy/core'
import { ComponentViewDescriptor } from '@soldy/setup'

export const emitsComponentView: TEmits = useEmits(ComponentViewDescriptor.model) as unknown as TEmits

export const propsComponentView: TProps = useProps(ComponentViewDescriptor.model, TComponentView) as TProps

console.log(propsComponentView, emitsComponentView)

export default {
	name: 'BaseComponentView',
	extends: BaseComponent,
	emits: emitsComponentView,
	props: propsComponentView,
}
