import { SelectGroupDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../../adapter'
import BaseSelectGroup, { type SelectGroupProps } from './base.component'

export default {
	name: '_SelectGroup',
	extends: BaseSelectGroup,
	expose: useExpose(),
	setup(props: SelectGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SelectGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
