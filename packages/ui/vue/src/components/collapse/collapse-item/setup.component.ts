import type { SetupContext } from 'vue'
import { TCollapseItem, type ICollapseItemProps, type ICollapseItem } from '@soldy/core'
import BaseCollapseItem, { syncCollapseItem } from './collapse-item.component'
import { createComponentViewBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../../composables/useComponentSetup'
import { useIconImport, useSplitAttrs } from '../../../composables'
import type { TBaseComponentViewProps } from '../../component-view'

export default {
	name: '_CollapseItem',
	inheritAttrs: false,
	extends: BaseCollapseItem,
	setup(props: TBaseComponentViewProps<ICollapseItemProps, ICollapseItem>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TCollapseItem,
			plugins: createComponentViewBundle,
			sync: (ctx) => syncCollapseItem(ctx),
		})(props, ctx)

		return {
			...base,
			arrowIconTag: useIconImport('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
