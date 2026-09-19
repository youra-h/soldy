import { SwitchDescriptor } from '@soldy/setup'
import {
	useAdapter,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseSwitch, { type SwitchProps } from './base.component'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: SwitchProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SwitchDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return { ...useAdapter(adapter, props, emit), ...useSplitAttrs() }
	},
}
