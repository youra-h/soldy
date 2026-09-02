import { useAdapter } from '../../adapter'
import { SwitchDescriptor } from '@soldy/setup'
import BaseSwitch from './base.component'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentProps } from '../../types'
import { type ISwitchProps, type ISwitch } from '@soldy/core'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: TBaseComponentProps<ISwitchProps, ISwitch>, { emit }: any) {
		return { ...useAdapter(SwitchDescriptor, props, emit), ...useSplitAttrs() }
	},
}
