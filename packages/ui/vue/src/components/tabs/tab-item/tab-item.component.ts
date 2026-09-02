import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemDescriptor } from '@soldy/setup'
import {
	default as BaseTabItemCustom,
} from './tab-item-custom.component'

export const emitsTabItem: TEmits = useEmits(TabItemDescriptor) as unknown as TEmits

export const propsTabItem: TProps = useProps(TabItemDescriptor) as TProps

export default {
	name: 'BaseTabItem',
	extends: BaseTabItemCustom,
	emits: emitsTabItem,
	props: propsTabItem,
}
