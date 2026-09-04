import { ComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { IconDescriptor } from '@soldy/setup'
import type { IIcon } from '@soldy/core'

export const emitsIcon: TEmits = useEmits(IconDescriptor()) as unknown as TEmits

export const propsIcon: TProps = useProps(IconDescriptor()) as TProps

export type IconProps = UseProps<typeof IconDescriptor, IIcon>

export default {
	name: 'BaseIcon',
	emits: emitsIcon,
	props: propsIcon,
}

