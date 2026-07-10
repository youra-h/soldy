import type { SetupContext } from 'vue'
import { TListBox, type IListBoxProps, type IListBox } from '@soldy/core'
import BaseListBox, { syncListBox } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { useElementBinding } from '../../composables/useElementBinding'
import { createListBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: TBaseComponentViewProps<IListBoxProps, IListBox>, { emit }: SetupContext) {
		const instance = useInstance(TListBox, props)

		const plugins = useBundle(createListBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { rendered, visible, disabled, classes, items } = syncListBox({
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
			disabled,
			classes,
			items,
		}
	},
}
