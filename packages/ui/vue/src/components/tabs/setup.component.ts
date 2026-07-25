import { useCollectionAdapter } from '../../adapter'
import { TabsDescriptor } from '@soldy/setup'
import BaseTabs from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ITabsProps, type ITabs } from '@soldy/core'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
		return useCollectionAdapter(TabsDescriptor, props, emit)
	},
}
