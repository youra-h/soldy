import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../../adapter'
import BaseListBoxGroup, { type ListBoxGroupProps } from './base.component'

export default {
	name: '_ListBoxGroup',
	extends: BaseListBoxGroup,
	expose: useExpose(),
	setup(props: ListBoxGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ListBoxGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
