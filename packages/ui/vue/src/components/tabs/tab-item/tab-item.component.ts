import { BaseValueControl } from '../../value-control'
import { useEmits, useProps, useCollectionItemEmits, useCollectionItemProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemDescriptor, TabsCollectionItemDescriptor } from '@soldy/setup'

export const emitsTabItem: TEmits = [
	...useEmits(TabItemDescriptor),
	...useCollectionItemEmits(TabsCollectionItemDescriptor),
] as unknown as TEmits

export const propsTabItem: TProps = {
	...useProps(TabItemDescriptor),
	...useCollectionItemProps(TabsCollectionItemDescriptor),
} as TProps

export default {
	name: 'BaseTabItem',
	extends: BaseValueControl,
	emits: emitsTabItem,
	props: propsTabItem,
}
