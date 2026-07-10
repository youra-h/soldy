import type { SetupContext } from 'vue'
import { TButton, type IButton, type IButtonProps } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseButton, { syncButton } from './base.component'
import { createComponentViewBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Button',
	extends: BaseButton,
	setup(props: TBaseComponentViewProps<IButtonProps, IButton>, { emit }: SetupContext) {
		const instance = useInstance(TButton, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { tag, rendered, visible, classes, disabled, text } = syncButton({
			props,
			instance,
			plugins,
			emit,
		})

		return {
			instance,
			plugins,
			rootRef,
			tag,
			rendered,
			visible,
			disabled,
			classes,
			text,
		}
	},
}
