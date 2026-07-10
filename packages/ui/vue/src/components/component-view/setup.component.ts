import type { SetupContext } from 'vue'
import { TComponentView, type IComponentViewProps } from '@soldy/core'
import BaseComponentView, { syncComponentView } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { createComponentViewBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from './types'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: TBaseComponentViewProps<IComponentViewProps>, { emit }: SetupContext) {
		const instance = useInstance(TComponentView, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { tag, rendered, visible, classes } = syncComponentView({
			props,
			instance,
			plugins,
			emit,
		})

		return { ctrl: instance, plugins, rootRef, tag, rendered, visible, classes }
	},
}
