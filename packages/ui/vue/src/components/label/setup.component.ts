import { LabelDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseLabel, { type LabelProps } from './base.component'
import { type ILabelProps, type ILabel } from '@soldy/core'

export default {
	name: '_Label',
	extends: BaseLabel,
	setup(props: LabelProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(LabelDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<ILabelProps, ILabel>(adapter, props, emit)
	},
}
