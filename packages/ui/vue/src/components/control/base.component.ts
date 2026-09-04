import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ControlDescriptor } from '@soldy/setup'
import type { IControl } from '@soldy/core'

export const emitsControl: TEmits = useEmits(ControlDescriptor()) as unknown as TEmits

export const propsControl: TProps = useProps(ControlDescriptor()) as TProps

export type ControlProps = UseProps<typeof ControlDescriptor, IControl>

export default {
	name: 'BaseControl',
	emits: emitsControl,
	props: propsControl,
}
