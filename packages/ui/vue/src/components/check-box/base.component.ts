import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { CheckBoxDescriptor } from '@soldy/setup'
import { Icon } from '../icon'

export const emitsCheckBox: TEmits = useEmits(CheckBoxDescriptor) as unknown as TEmits

export const propsCheckBox: TProps = useProps(CheckBoxDescriptor) as TProps

export default {
	name: 'BaseCheckBox',
	extends: BaseInputControl,
	components: { Icon },
	emits: emitsCheckBox,
	props: propsCheckBox,
}
