import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../../adapter'
import BaseMenuSeparator, { type MenuSeparatorProps } from './base.component'

export default {
	name: '_MenuSeparator',
	extends: BaseMenuSeparator,
	expose: useExpose(),
	setup(props: MenuSeparatorProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuSeparatorDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
