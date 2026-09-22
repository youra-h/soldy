import { InputDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseInput, { type InputProps } from './base.component'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: InputProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(InputDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return { ...useAdapter(adapter, props, emit), ...useSplitAttrs() }
	},
}
