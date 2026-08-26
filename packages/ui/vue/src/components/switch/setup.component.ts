import { toRaw } from 'vue'
import { createAdapterContext, SwitchDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseSwitch from './base.component'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentProps } from '../../types'
import { type ISwitchProps, type ISwitch } from '@soldy/core'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: TBaseComponentProps<ISwitchProps, ISwitch>, { emit }: any) {
		const adapter = createAdapterContext(SwitchDescriptor, {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return { ...useVue<ISwitchProps, ISwitch>(adapter, props, emit), ...useSplitAttrs() }
	},
}
