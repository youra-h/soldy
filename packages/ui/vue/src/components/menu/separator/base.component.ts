import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { TMenuSeparator } from '@soldy-ui/core'

export const emitsMenuSeparator: TEmits = useEmits(MenuSeparatorDescriptor())

export const propsMenuSeparator: TProps = useProps(MenuSeparatorDescriptor()) as TProps

export type MenuSeparatorProps = UseProps<typeof MenuSeparatorDescriptor, TMenuSeparator>

export default {
	name: 'BaseMenuSeparator',
	emits: emitsMenuSeparator,
	props: propsMenuSeparator,
}
