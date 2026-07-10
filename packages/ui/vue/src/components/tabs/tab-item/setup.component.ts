import type { SetupContext } from 'vue'
import { TTabItem, type ITabItemProps, type ITabItem } from '@soldy/core'
import BaseTabItem, { syncTabItem } from './tab-item.component'
import {
	useInstance,
	useIconImport,
	useBundle,
	useElementBinding,
	useInstanceBinding,
	useSplitAttrs,
} from '../../../composables'
import { createComponentViewBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../../component-view'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentViewProps<ITabItemProps, ITabItem>, { emit }: SetupContext) {
		const instance = useInstance(TTabItem, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const {
			rendered,
			disabled,
			visible,
			classes,
			size,
			variant,
			text,
			active,
			closable,
			order,
		} = syncTabItem({
			props,
			instance,
			plugins,
			emit,
		})

		const closeIconTag = useIconImport('close')

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			instance,
			closeIconTag,
			plugins,
			rootRef,
			rendered,
			disabled,
			visible,
			classes,
			size,
			variant,
			text,
			active,
			closable,
			order,
		}
	},
}
