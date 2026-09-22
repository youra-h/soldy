import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { StylableDescriptor } from '@soldy-ui/setup'
import type { IStylable } from '@soldy-ui/core'

export const emitsStylable: TEmits = useEmits(StylableDescriptor())

export const propsStylable: TProps = useProps(StylableDescriptor()) as TProps

export type StylableProps = UseProps<typeof StylableDescriptor, IStylable>

export default {
	name: 'BaseStylable',
	emits: emitsStylable,
	props: propsStylable,
}
