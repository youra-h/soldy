import type { SetupContext } from 'vue'
import { TCollapse, type ICollapseProps, type ICollapse } from '@soldy/core'
import BaseCollapse, { syncCollapse } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { createCollapseBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentViewProps<ICollapseProps, ICollapse>, { emit }: SetupContext) {
		const instance = useInstance(TCollapse, props)

		const plugins = useBundle(createCollapseBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { rendered, visible, classes, items, view, mode, selected } = syncCollapse({
			props,
			instance,
			plugins,
			emit,
		})

		return {
			instance,
			plugins,
			rootRef,
			rendered,
			visible,
			classes,
			items,
			view,
			mode,
			selected,
		}
	},
}
