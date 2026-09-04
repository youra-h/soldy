import { toRaw } from 'vue'
import { createAdapterContext, InputDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseInput, { type InputProps } from './base.component'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import { type IInputProps, type IInput } from '@soldy/core'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: InputProps, { emit }: any) {
		const adapter = createAdapterContext(InputDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return { ...useAdapter<IInputProps, IInput>(adapter, props, emit), ...useSplitAttrs() }
	},
}
