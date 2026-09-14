import { ButtonDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseButton, { type ButtonProps } from './base.component'
import { type IButtonProps, type IButton } from '@soldy/core'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: ButtonProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ButtonDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<IButtonProps, IButton>(adapter, props, emit)
	},
}
