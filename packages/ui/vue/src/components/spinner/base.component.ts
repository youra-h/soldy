import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { SpinnerDescriptor } from '@soldy/setup'

export const emitsSpinner: TEmits = useEmits(SpinnerDescriptor) as TEmits

export const propsSpinner: TProps = useProps(SpinnerDescriptor) as TProps

export default {
	name: 'BaseSpinner',
	extends: BaseStylable,
	emits: emitsSpinner,
	props: propsSpinner,
}
