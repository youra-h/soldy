import { BaseValueControl } from '../../value-control'
import {
	useEmits,
	useProps,
	useCollectionItemProps,
	useCollectionItemEmits,
} from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemDescriptor, TabsCollectionDescriptor } from '@soldy/setup'

export const emitsTabItem: TEmits = [
	...useEmits(TabItemDescriptor()),
	...useCollectionItemEmits(TabsCollectionDescriptor()),
] as unknown as TEmits

export const propsTabItem: TProps = {
	...(useProps(TabItemDescriptor()) as TProps),
	...(useCollectionItemProps(TabsCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseTabItem',
	extends: BaseValueControl,
	emits: emitsTabItem,
	props: propsTabItem,
}
