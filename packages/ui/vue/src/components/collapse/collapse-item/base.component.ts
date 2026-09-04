import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { CollapseItemDescriptor, CollapseCollectionItemDescriptor } from '@soldy/setup'
import type { ICollapseItem } from '@soldy/core'

export const emitsCollapseItem: TEmits = [
	...useEmits(CollapseItemDescriptor()),
	...useEmits(CollapseCollectionItemDescriptor()),
] as unknown as TEmits

export const propsCollapseItem: TProps = {
	...(useProps(CollapseItemDescriptor()) as TProps),
	...(useProps(CollapseCollectionItemDescriptor()) as TProps),
}

export type CollapseItemProps = UseProps<typeof CollapseItemDescriptor, ICollapseItem>

export default {
	name: 'BaseCollapseItem',
	emits: emitsCollapseItem,
	props: propsCollapseItem,
}
