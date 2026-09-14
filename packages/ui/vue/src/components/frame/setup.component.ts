import { FrameDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseFrame, { type FrameProps } from './base.component'
import { type IFrameProps, type IFrame } from '@soldy/core'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: FrameProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(FrameDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<IFrameProps, IFrame>(adapter, props, emit)
	},
}
