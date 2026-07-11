import type { SetupContext } from 'vue'
import { TSwitch, type ISwitchProps, type ISwitch } from '@soldy/core'
import BaseSwitch, { syncSwitch } from './base.component'
import { createInputBoolBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: TBaseComponentViewProps<ISwitchProps, ISwitch>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TSwitch,
			plugins: createInputBoolBundle,
			sync: (ctx) => syncSwitch(ctx),
		})(props, ctx)

		return { ...base, ...useSplitAttrs() }
	},
}
