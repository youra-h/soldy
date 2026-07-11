import type { SetupContext } from 'vue'
import { TListBoxItem, type IListItemProps, type IListBoxItem } from '@soldy/core'
import BaseListBoxItem, { syncListBoxItem } from './list-box-item.component'
import { createListItemBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../../composables/useComponentSetup'
import { useSplitAttrs } from '../../../composables/useSplitAttrs'
import type { TBaseComponentViewProps } from '../../component-view'

export default {
	name: '_ListBoxItem',
	inheritAttrs: false,
	extends: BaseListBoxItem,
	setup(props: TBaseComponentViewProps<IListItemProps, IListBoxItem>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TListBoxItem,
			plugins: createListItemBundle,
			sync: (ctx) => syncListBoxItem(ctx),
		})(props, ctx)

		return { ...base, ...useSplitAttrs() }
	},
}
