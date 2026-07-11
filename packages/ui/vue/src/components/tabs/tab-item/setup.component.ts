import type { SetupContext } from 'vue'
import { TTabItem, type ITabItemProps, type ITabItem } from '@soldy/core'
import BaseTabItem, { syncTabItem } from './tab-item.component'
import { createComponentViewBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../../composables/useComponentSetup'
import { useIconImport, useSplitAttrs } from '../../../composables'
import type { TBaseComponentViewProps } from '../../component-view'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentViewProps<ITabItemProps, ITabItem>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TTabItem,
			plugins: createComponentViewBundle,
			sync: (ctx) => syncTabItem(ctx),
		})(props, ctx)

		return {
			...base,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}
