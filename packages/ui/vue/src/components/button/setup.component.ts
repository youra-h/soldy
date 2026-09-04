import { toRaw } from 'vue'
import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseButton, { type ButtonProps } from './base.component'
import { type IButtonProps, type IButton } from '@soldy/core'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: ButtonProps, { emit }: any) {
		const adapter = createAdapterContext(ButtonDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IButtonProps, IButton>(adapter, props, emit)
	},
}
