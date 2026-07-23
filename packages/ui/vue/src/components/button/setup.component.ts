import { useAdapter } from '../../adapter'
import { ButtonDescriptor } from '@soldy/setup'
import BaseButton from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IButtonProps, type IButton } from '@soldy/core'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: TBaseComponentProps<IButtonProps, IButton>, { emit }: any) {
		return useAdapter(ButtonDescriptor, props, emit)
	},
}
