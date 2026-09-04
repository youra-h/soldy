import type { TEmits, TProps, UseProps } from '../../types'
import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import { ComponentViewDescriptor } from '@soldy/setup'
import type { IComponentView } from '@soldy/core'

export const emitsComponentView: TEmits = useEmits(ComponentViewDescriptor()) as unknown as TEmits

export const propsComponentView: TProps = useProps(ComponentViewDescriptor()) as TProps

export type ComponentViewProps = UseProps<typeof ComponentViewDescriptor, IComponentView>

export default {
	name: 'BaseComponentView',
	emits: emitsComponentView,
	props: propsComponentView,
}
