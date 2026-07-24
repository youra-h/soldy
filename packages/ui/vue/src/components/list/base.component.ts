import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListDescriptor } from '@soldy/setup'

export const emitsList: TEmits = useEmits(ListDescriptor) as unknown as TEmits

export const propsList: TProps = useProps(ListDescriptor) as TProps

export default {
	name: 'BaseList',
	extends: BaseControl,
	emits: emitsList,
	props: propsList,
}
