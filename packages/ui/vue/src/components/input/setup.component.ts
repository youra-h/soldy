import { InputDescriptor } from '@soldy/setup'
import {
	useAdapter,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseInput, { type InputProps } from './base.component'
import { type IInputProps, type IInput } from '@soldy/core'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: InputProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(InputDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return { ...useAdapter<IInputProps, IInput>(adapter, props, emit), ...useSplitAttrs() }
	},
}
