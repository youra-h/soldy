import { useAdapter } from '../../adapter'
import { FrameDescriptor } from '@soldy/setup'
import BaseFrame from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IFrameProps, type IFrame } from '@soldy/core'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: TBaseComponentProps<IFrameProps, IFrame>, { emit }: any) {
		return useAdapter(FrameDescriptor, props, emit)
	},
}
