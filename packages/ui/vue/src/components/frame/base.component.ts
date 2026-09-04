import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { FrameDescriptor } from '@soldy/setup'
import type { IFrame } from '@soldy/core'

export const emitsFrame: TEmits = useEmits(FrameDescriptor()) as unknown as TEmits

export const propsFrame: TProps = useProps(FrameDescriptor()) as TProps

export type FrameProps = UseProps<typeof FrameDescriptor, IFrame>

export default {
	name: 'BaseFrame',
	emits: emitsFrame,
	props: propsFrame,
}
