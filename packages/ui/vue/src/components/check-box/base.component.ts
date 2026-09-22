import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { CheckBoxDescriptor } from '@soldy-ui/setup'
import { Icon } from '../icon'
import type { ICheckBox } from '@soldy-ui/core'

export const emitsCheckBox: TEmits = useEmits(CheckBoxDescriptor())

export const propsCheckBox: TProps = useProps(CheckBoxDescriptor()) as TProps

export type CheckBoxProps = UseProps<typeof CheckBoxDescriptor, ICheckBox>

export default {
	name: 'BaseCheckBox',
	components: { Icon },
	emits: emitsCheckBox,
	props: propsCheckBox,
}
