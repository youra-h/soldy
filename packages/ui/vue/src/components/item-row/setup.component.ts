import { ItemRowDescriptor } from '@soldy-ui/setup'
import { useAdapter, useExpose, createVueAdapterContext, type SetupContext } from '../../adapter'
import { BaseButton } from '../button'
import type { ButtonProps } from '../button/base.component'

export default {
	name: '_ItemRow',
	extends: BaseButton,
	expose: useExpose(),
	setup(props: ButtonProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ItemRowDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
