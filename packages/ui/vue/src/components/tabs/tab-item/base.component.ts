import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemDescriptor, TabsCollectionItemDescriptor } from '@soldy/setup'

export const emitsTabItem: TEmits = [
	...useEmits(TabItemDescriptor()),
	...useEmits(TabsCollectionItemDescriptor()),
] as unknown as TEmits

export const propsTabItem: TProps = {
	...(useProps(TabItemDescriptor()) as TProps),
	...(useProps(TabsCollectionItemDescriptor()) as TProps),
}

export default {
	name: 'BaseTabItem',
	extends: BaseValueControl,
	emits: emitsTabItem,
	props: propsTabItem,
}
