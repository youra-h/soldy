import type { SetupContext } from 'vue'
import { type IFrameProps, type IFrame, TFrame } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseFrame, { syncFrame } from './base.component'
import { createFrameBundle } from '@soldy/plugins'
import type { TBaseComponentProps } from '../component'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: TBaseComponentProps<IFrameProps, IFrame>, { emit }: SetupContext) {
		const instance = useInstance(TFrame, props)

		const plugins = useBundle(createFrameBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { visible, rendered, x, y, width, height, styles, target } = syncFrame({
			props,
			instance,
			plugins,
			emit,
		})

		return {
			instance,
			plugins,
			rootRef,
			styles,
			visible,
			rendered,
			x,
			y,
			width,
			height,
			target,
		}
	},
}
