import { toRaw } from 'vue'
import { createAdapterContext, FrameDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseFrame, { type FrameProps } from './base.component'
import { type IFrameProps, type IFrame } from '@soldy/core'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: FrameProps, { emit }: any) {
		const adapter = createAdapterContext(FrameDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IFrameProps, IFrame>(adapter, props, emit)
	},
}
