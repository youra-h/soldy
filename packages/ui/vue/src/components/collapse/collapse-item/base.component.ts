import { BaseValueControl } from '../../value-control'
import {
	useEmits,
	useProps,
	useCollectionItemProps,
	useCollectionItemEmits,
} from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { CollapseItemDescriptor, CollapseCollectionDescriptor } from '@soldy/setup'

export const emitsCollapseItem: TEmits = [
	...useEmits(CollapseItemDescriptor()),
	...useCollectionItemEmits(CollapseCollectionDescriptor()),
] as unknown as TEmits

export const propsCollapseItem: TProps = {
	...(useProps(CollapseItemDescriptor()) as TProps),
	...(useCollectionItemProps(CollapseCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseCollapseItem',
	extends: BaseValueControl,
	emits: emitsCollapseItem,
	props: propsCollapseItem,
}
