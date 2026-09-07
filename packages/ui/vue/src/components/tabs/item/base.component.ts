import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TabsItemDescriptor, TabsCollectionItemDescriptor } from '@soldy/setup'
import type { ITabsItem } from '@soldy/core'

export const emitsTabsItem: TEmits = [
	...useEmits(TabsItemDescriptor()),
	...useEmits(TabsCollectionItemDescriptor()),
] as unknown as TEmits

export const propsTabsItem: TProps = {
	...(useProps(TabsItemDescriptor()) as TProps),
	...(useProps(TabsCollectionItemDescriptor()) as TProps),
}

export type TabsItemProps = UseProps<typeof TabsItemDescriptor, ITabsItem>

export default {
	name: 'BaseTabsItem',
	emits: emitsTabsItem,
	props: propsTabsItem,
}
