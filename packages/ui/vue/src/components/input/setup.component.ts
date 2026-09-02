import { useAdapter } from '../../adapter'
import { InputDescriptor } from '@soldy/setup'
import BaseInput from './base.component'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentProps } from '../../types'
import { type IInputProps, type IInput } from '@soldy/core'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: TBaseComponentProps<IInputProps, IInput>, { emit }: any) {
		return { ...useAdapter(InputDescriptor, props, emit), ...useSplitAttrs() }
	},
}
