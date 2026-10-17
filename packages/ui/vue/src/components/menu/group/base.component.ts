import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuGroupDescriptor } from '@soldy-ui/setup'
import type { IMenuGroup } from '@soldy-ui/core'

export const emitsMenuGroup: TEmits = useEmits(MenuGroupDescriptor())

export const propsMenuGroup: TProps = useProps(MenuGroupDescriptor()) as TProps

export type MenuGroupProps = UseProps<typeof MenuGroupDescriptor, IMenuGroup>

export default {
	name: 'BaseMenuGroup',
	emits: emitsMenuGroup,
	props: propsMenuGroup,
}
