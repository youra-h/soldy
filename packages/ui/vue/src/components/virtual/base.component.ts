import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'

export const emitsVirtual: TEmits = useEmits(VirtualDescriptor())

export const propsVirtual: TProps = useProps(VirtualDescriptor()) as TProps

export type VirtualProps = UseProps<typeof VirtualDescriptor, IVirtual>

export default {
	name: 'BaseVirtual',
	emits: emitsVirtual,
	props: propsVirtual,
}
