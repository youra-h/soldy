import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { SelectGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'

export const emitsSelectGroup: TEmits = useEmits(SelectGroupDescriptor())

export const propsSelectGroup: TProps = useProps(SelectGroupDescriptor()) as TProps

export type SelectGroupProps = UseProps<typeof SelectGroupDescriptor, IItemGroup>

export default {
	name: 'BaseSelectGroup',
	emits: emitsSelectGroup,
	props: propsSelectGroup,
}
