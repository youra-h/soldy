import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { FrameDescriptor } from '@soldy-ui/setup'
import type { IFrame } from '@soldy-ui/core'

export const emitsFrame: TEmits = useEmits(FrameDescriptor())

export const propsFrame: TProps = useProps(FrameDescriptor()) as TProps

export type FrameProps = UseProps<typeof FrameDescriptor, IFrame>

export default {
	name: 'BaseFrame',
	emits: emitsFrame,
	props: propsFrame,
}
