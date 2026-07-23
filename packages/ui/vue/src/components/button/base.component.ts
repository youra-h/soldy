import { BaseTextable } from '../textable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ButtonDescriptor } from '@soldy/setup'

export const emitsButton: TEmits = useEmits(ButtonDescriptor) as unknown as TEmits

export const propsButton: TProps = useProps(ButtonDescriptor) as TProps

export default {
	name: 'BaseButton',
	extends: BaseTextable,
	emits: emitsButton,
	props: propsButton,
}
