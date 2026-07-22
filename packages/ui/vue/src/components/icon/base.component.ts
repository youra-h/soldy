import { type PropType } from 'vue'
import { type IIconProps, TIcon } from '@soldy/core'
import { ComponentView, emitsComponentView, propsComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { IconDescriptor } from '@soldy/setup'

const model = IconDescriptor.model

export const emitsIcon: TEmits = useEmits(model) as unknown as TEmits

export const propsIcon: TProps = useProps(model) as TProps

export default {
	name: 'BaseIcon',
	extends: ComponentView,
	emits: emitsIcon,
	props: propsIcon,
}

