import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { CollapseItemDescriptor, CollapseCollectionItemDescriptor } from '@soldy/setup'

export const emitsCollapseItem: TEmits = [
	...useEmits(CollapseItemDescriptor()),
	...useEmits(CollapseCollectionItemDescriptor()),
] as unknown as TEmits

export const propsCollapseItem: TProps = {
	...(useProps(CollapseItemDescriptor()) as TProps),
	...(useProps(CollapseCollectionItemDescriptor()) as TProps),
}

export default {
	name: 'BaseCollapseItem',
	extends: BaseValueControl,
	emits: emitsCollapseItem,
	props: propsCollapseItem,
}
