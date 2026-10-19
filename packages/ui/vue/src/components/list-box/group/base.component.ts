import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'

export const emitsListBoxGroup: TEmits = useEmits(ListBoxGroupDescriptor())

export const propsListBoxGroup: TProps = useProps(ListBoxGroupDescriptor()) as TProps

export type ListBoxGroupProps = UseProps<typeof ListBoxGroupDescriptor, IItemGroup>

export default {
	name: 'BaseListBoxGroup',
	emits: emitsListBoxGroup,
	props: propsListBoxGroup,
}
