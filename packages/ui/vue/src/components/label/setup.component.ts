import { LabelDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseLabel, { type LabelProps } from './base.component'

export default {
	name: '_Label',
	extends: BaseLabel,
	setup(props: LabelProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(LabelDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
