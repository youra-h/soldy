import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TabItemDescriptor, TabsCollectionItemDescriptor } from '@soldy/setup'
import type { ITabItem } from '@soldy/core'

export const emitsTabItem: TEmits = [
	...useEmits(TabItemDescriptor()),
	...useEmits(TabsCollectionItemDescriptor()),
] as unknown as TEmits

export const propsTabItem: TProps = {
	...(useProps(TabItemDescriptor()) as TProps),
	...(useProps(TabsCollectionItemDescriptor()) as TProps),
}

export type TabItemProps = UseProps<typeof TabItemDescriptor, ITabItem>

export default {
	name: 'BaseTabItem',
	emits: emitsTabItem,
	props: propsTabItem,
}
