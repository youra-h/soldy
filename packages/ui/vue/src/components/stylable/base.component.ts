import { BaseComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { StylableDescriptor } from '@soldy/setup'
import type { IStylable } from '@soldy/core'

export const emitsStylable: TEmits = useEmits(StylableDescriptor()) as unknown as TEmits

export const propsStylable: TProps = useProps(StylableDescriptor()) as TProps

export type StylableProps = UseProps<typeof StylableDescriptor, IStylable>

export default {
	name: 'BaseStylable',
	emits: emitsStylable,
	props: propsStylable,
}
