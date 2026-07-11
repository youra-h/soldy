import type { SetupContext } from 'vue'
import { TSpinner, type ISpinnerProps, type ISpinner } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseSpinner, { syncSpinner } from './base.component'
import { createComponentViewBundle, TSpinnerStylePlugin } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: TBaseComponentViewProps<ISpinnerProps, ISpinner>, { emit }: SetupContext) {
		const instance = useInstance(TSpinner, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins).use(
			TSpinnerStylePlugin,
		)

		useInstanceBinding(plugins, instance)

		const rootElement = useElementBinding(plugins)

		const { tag, rendered, visible, classes, size, variant, borderWidth, styles } =
			syncSpinner({
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
			size,
			variant,
			borderWidth,
		}
	},
}
