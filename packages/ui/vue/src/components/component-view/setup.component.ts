import { ComponentViewDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseComponentView, { type ComponentViewProps } from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: ComponentViewProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ComponentViewDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
