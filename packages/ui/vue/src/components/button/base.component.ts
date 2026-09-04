import { BaseTextable } from '../textable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ButtonDescriptor } from '@soldy/setup'
import type { IButton } from '@soldy/core'

export const emitsButton: TEmits = useEmits(ButtonDescriptor()) as unknown as TEmits

export const propsButton: TProps = useProps(ButtonDescriptor()) as TProps

export type ButtonProps = UseProps<typeof ButtonDescriptor, IButton>

export default {
	name: 'BaseButton',
	emits: emitsButton,
	props: propsButton,
}
