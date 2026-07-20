import { useAdapter } from '../../adapter'
import { ComponentViewDescriptor } from '@soldy/setup'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import type { TBaseComponentViewProps } from './types'
import BaseComponentView from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: TBaseComponentViewProps<IComponentViewProps, IComponentView>, { emit }: any) {
		return useAdapter(ComponentViewDescriptor, props, emit)
	},
}
