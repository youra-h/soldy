import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { FrameDescriptor } from '@soldy/setup'

export const emitsFrame: TEmits = useEmits(FrameDescriptor) as unknown as TEmits

export const propsFrame: TProps = useProps(FrameDescriptor) as TProps

export default {
	name: 'BaseFrame',
	extends: BaseComponent,
	emits: emitsFrame,
	props: propsFrame,
}
