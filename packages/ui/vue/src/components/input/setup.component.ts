import { toRaw } from 'vue'
import { createAdapterContext, InputDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseInput from './base.component'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentProps } from '../../types'
import { type IInputProps, type IInput } from '@soldy/core'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: TBaseComponentProps<IInputProps, IInput>, { emit }: any) {
		const adapter = createAdapterContext(InputDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return { ...useVue<IInputProps, IInput>(adapter, props, emit), ...useSplitAttrs() }
	},
}
