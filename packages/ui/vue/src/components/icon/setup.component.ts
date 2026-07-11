import type { SetupContext } from 'vue'
import { TIcon, type IIconProps, type IIcon } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseIcon, { syncIcon } from './base.component'
import { createComponentViewBundle, TIconStylePlugin } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentViewProps<IIconProps, IIcon>, { emit }: SetupContext) {
		const instance = useInstance(TIcon, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins).use(TIconStylePlugin)

		useInstanceBinding(plugins, instance)

		const rootElement = useElementBinding(plugins)

		const { tag, rendered, visible, classes, styles } = syncIcon({
			props,
			instance,
			plugins,
			emit,
		})

		return {
			ctrl: instance,
			plugins,
			rootElement,
			styles,
			tag,
			rendered,
			visible,
			classes,
		}
	},
}
