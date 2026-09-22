import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'

export const emitsButton: TEmits = useEmits(ButtonDescriptor())

export const propsButton: TProps = useProps(ButtonDescriptor()) as TProps

export type ButtonProps = UseProps<typeof ButtonDescriptor, IButton>

export default {
	name: 'BaseButton',
	emits: emitsButton,
	props: propsButton,
}
