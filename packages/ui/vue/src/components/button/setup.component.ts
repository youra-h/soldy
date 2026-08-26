import { toRaw } from 'vue'
import { createAdapterContext, ButtonDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseButton from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IButtonProps, type IButton } from '@soldy/core'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: TBaseComponentProps<IButtonProps, IButton>, { emit }: any) {
		const adapter = createAdapterContext(ButtonDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useVue<IButtonProps, IButton>(adapter, props, emit)
	},
}
