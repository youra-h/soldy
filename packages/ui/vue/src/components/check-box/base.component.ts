import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { CheckBoxDescriptor } from '@soldy/setup'
import { Icon } from '../icon'
import type { ICheckBox } from '@soldy/core'

export const emitsCheckBox: TEmits = useEmits(CheckBoxDescriptor()) as unknown as TEmits

export const propsCheckBox: TProps = useProps(CheckBoxDescriptor()) as TProps

export type CheckBoxProps = UseProps<typeof CheckBoxDescriptor, ICheckBox>

export default {
	name: 'BaseCheckBox',
	components: { Icon },
	emits: emitsCheckBox,
	props: propsCheckBox,
}
