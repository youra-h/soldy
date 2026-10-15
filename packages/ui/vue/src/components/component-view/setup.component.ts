import { ComponentViewDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseComponentView, { type ComponentViewProps } from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	expose: useExpose(),
	setup(props: ComponentViewProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ComponentViewDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
