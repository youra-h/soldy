import { MenuGroupDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../../adapter'
import BaseMenuGroup, { type MenuGroupProps } from './base.component'

export default {
	name: '_MenuGroup',
	extends: BaseMenuGroup,
	expose: useExpose(),
	setup(props: MenuGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
