import type { SetupContext } from 'vue'
import { TTabs, type ITabsProps, type ITabs } from '@soldy/core'
import BaseTabs, { syncTabs } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { createTabsBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentViewProps<ITabsProps, ITabs>, { emit }: SetupContext) {
		const instance = useInstance(TTabs, props)

		const plugins = useBundle(createTabsBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { rendered, visible, classes, items, activeItem } = syncTabs({
			props,
			instance,
			plugins,
			emit,
		})

		return { instance, plugins, rootRef, rendered, visible, classes, activeItem, items }
	},
}
