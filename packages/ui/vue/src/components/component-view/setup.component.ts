import { ComponentViewDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import BaseComponentView, { type ComponentViewProps } from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: ComponentViewProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ComponentViewDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<IComponentViewProps, IComponentView>(adapter, props, emit)
	},
}
