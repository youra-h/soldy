import { toRaw } from 'vue'
import { createAdapterContext, SwitchDescriptor } from '@soldy/setup'
import { useAdapter, useSplitAttrs } from '../../adapter'
import BaseSwitch, { type SwitchProps } from './base.component'
import { type ISwitchProps, type ISwitch } from '@soldy/core'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: SwitchProps, { emit }: any) {
		const adapter = createAdapterContext(SwitchDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return { ...useAdapter<ISwitchProps, ISwitch>(adapter, props, emit), ...useSplitAttrs() }
	},
}
