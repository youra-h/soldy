import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuRadioGroupDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'

export const emitsMenuRadioGroup: TEmits = useEmits(MenuRadioGroupDescriptor())

export const propsMenuRadioGroup: TProps = useProps(MenuRadioGroupDescriptor()) as TProps

export type MenuRadioGroupProps = UseProps<typeof MenuRadioGroupDescriptor, IMenuRadioGroup>

export default {
	name: 'BaseMenuRadioGroup',
	emits: emitsMenuRadioGroup,
	props: propsMenuRadioGroup,
}
