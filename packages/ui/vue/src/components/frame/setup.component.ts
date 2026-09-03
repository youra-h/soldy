import { toRaw } from 'vue'
import { createAdapterContext, FrameDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseFrame from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IFrameProps, type IFrame } from '@soldy/core'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: TBaseComponentProps<IFrameProps, IFrame>, { emit }: any) {
		const adapter = createAdapterContext(FrameDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IFrameProps, IFrame>(adapter, props, emit)
	},
}
