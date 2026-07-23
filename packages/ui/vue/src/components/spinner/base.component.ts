import { ComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { SpinnerDescriptor } from '@soldy/setup'

export const emitsSpinner: TEmits = useEmits(SpinnerDescriptor) as unknown as TEmits

export const propsSpinner: TProps = useProps(SpinnerDescriptor) as TProps

export default {
	name: 'BaseSpinner',
	extends: ComponentView,
	emits: emitsSpinner,
	props: propsSpinner,
}
