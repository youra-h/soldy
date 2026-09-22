import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'

export const emitsPopover: TEmits = useEmits(PopoverDescriptor())

export const propsPopover: TProps = useProps(PopoverDescriptor()) as TProps

export type PopoverProps = UseProps<typeof PopoverDescriptor, IPopover>

export default {
	name: 'BasePopover',
	emits: emitsPopover,
	props: propsPopover,
}
