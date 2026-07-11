import type { SetupContext } from 'vue'
import { TListBoxItem, type IListItemProps, type IListBoxItem } from '@soldy/core'
import BaseListBoxItem, { syncListBoxItem } from './list-box-item.component'
import { useInstance } from '../../../composables/useInstance'
import { useBundle } from '../../../composables/useBundle'
import { useInstanceBinding } from '../../../composables/useInstanceBinding'
import { useElementBinding } from '../../../composables/useElementBinding'
import { useSplitAttrs } from '../../../composables/useSplitAttrs'
import { createListItemBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../../component-view'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: TBaseComponentViewProps<IListItemProps, IListBoxItem>, { emit }: SetupContext) {
		const instance = useInstance(TListBoxItem, props)

		const plugins = useBundle(createListItemBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootElement = useElementBinding(plugins)

		const {
			tag,
			rendered,
			visible,
			classes,
			disabled,
			size,
			variant,
			text,
			selected,
			view,
			order,
			highlighted,
		} = syncListBoxItem({ props, instance, plugins, emit })

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			ctrl: instance,
			plugins,
			rootElement,
			tag,
			rendered,
			visible,
			classes,
			disabled,
			size,
			variant,
			text,
			selected,
			highlighted,
			view,
			order,
		}
	},
}
