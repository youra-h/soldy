import type { SetupContext } from 'vue'
import { TCollapseItem, type ICollapseItemProps, type ICollapseItem } from '@soldy/core'
import BaseCollapseItem, { syncCollapseItem } from './collapse-item.component'
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
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentViewProps<ICollapseItemProps, ICollapseItem>, { emit }: SetupContext) {
		const instance = useInstance(TCollapseItem, props)

		const plugins = useBundle(createComponentViewBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const {
			rendered,
			visible,
			classes,
			disabled,
			size,
			variant,
			text,
			selected,
			arrowPlacement,
			view,
			order,
		} = syncCollapseItem({ props, instance, plugins, emit })

		const arrowIconTag = useIconImport('arrowRight')

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			instance,
			arrowIconTag,
			plugins,
			rootRef,
			rendered,
			visible,
			classes,
			disabled,
			size,
			variant,
			text,
			selected,
			arrowPlacement,
			view,
			order,
		}
	},
}
