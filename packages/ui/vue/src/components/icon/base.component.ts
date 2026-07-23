import { ComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { IconDescriptor } from '@soldy/setup'

export const emitsIcon: TEmits = useEmits(IconDescriptor) as unknown as TEmits

export const propsIcon: TProps = useProps(IconDescriptor) as TProps

export default {
	name: 'BaseIcon',
	extends: ComponentView,
	emits: emitsIcon,
	props: propsIcon,
}

