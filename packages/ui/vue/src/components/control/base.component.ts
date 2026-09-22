import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ControlDescriptor } from '@soldy-ui/setup'
import type { IControl } from '@soldy-ui/core'

export const emitsControl: TEmits = useEmits(ControlDescriptor())

export const propsControl: TProps = useProps(ControlDescriptor()) as TProps

export type ControlProps = UseProps<typeof ControlDescriptor, IControl>

export default {
	name: 'BaseControl',
	emits: emitsControl,
	props: propsControl,
}
