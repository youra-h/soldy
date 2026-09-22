import { ButtonDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseButton, { type ButtonProps } from './base.component'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: ButtonProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ButtonDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
