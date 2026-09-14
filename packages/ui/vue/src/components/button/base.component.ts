import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ButtonDescriptor, type TAriaPluginProps } from '@soldy/setup'
import type { IButton } from '@soldy/core'

export const emitsButton: TEmits = useEmits(ButtonDescriptor()) as unknown as TEmits

export const propsButton: TProps = useProps(ButtonDescriptor()) as TProps

// `DescriptorProps` видит только собственные props компонента — плагинные
// (здесь: AriaPlugin, подключённый через ControlDescriptor) в неё не попадают,
// поэтому домешиваются вручную типом-зеркалом из contribution плагина.
export type ButtonProps = UseProps<typeof ButtonDescriptor, IButton> & TAriaPluginProps

export default {
	name: 'BaseButton',
	emits: emitsButton,
	props: propsButton,
}
