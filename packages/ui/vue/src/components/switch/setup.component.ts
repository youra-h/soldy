import type { SetupContext } from 'vue'
import { TSwitch, type ISwitchProps, type ISwitch } from '@soldy/core'
import BaseSwitch, { syncSwitch } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import { createInputBoolBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	setup(props: TBaseComponentViewProps<ISwitchProps, ISwitch>, { emit }: SetupContext) {
		const instance = useInstance(TSwitch, props)

		const plugins = useBundle(createInputBoolBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { rendered, visible, classes, disabled, name, size, value, readonly, required } =
			syncSwitch({
				props,
				instance,
				plugins,
				emit,
			})

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			instance,
			plugins,
			rootRef,
			rendered,
			visible,
			classes,
			disabled,
			name,
			size,
			value,
			readonly,
			required,
		}
	},
}
