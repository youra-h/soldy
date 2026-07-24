import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { CollapseItemDescriptor } from '@soldy/setup'
import { default as BaseCollapseItemCustom } from './collapse-item-custom.component'

export const emitsCollapseItem: TEmits = useEmits(CollapseItemDescriptor) as unknown as TEmits

export const propsCollapseItem: TProps = useProps(CollapseItemDescriptor) as TProps

export default {
	name: 'BaseCollapseItem',
	extends: BaseCollapseItemCustom,
	emits: emitsCollapseItem,
	props: propsCollapseItem,
}
