import { BaseComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { StylableDescriptor } from '@soldy/setup'

export const emitsStylable: TEmits = useEmits(StylableDescriptor) as unknown as TEmits

export const propsStylable: TProps = useProps(StylableDescriptor) as TProps

export default {
	name: 'BaseStylable',
	extends: BaseComponentView,
	emits: emitsStylable,
	props: propsStylable,
}
