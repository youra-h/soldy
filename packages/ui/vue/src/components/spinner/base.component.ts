import { BaseStylable } from '../stylable'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SpinnerDescriptor } from '@soldy/setup'
import type { ISpinner } from '@soldy/core'

export const emitsSpinner: TEmits = useEmits(SpinnerDescriptor()) as unknown as TEmits

export const propsSpinner: TProps = useProps(SpinnerDescriptor()) as TProps

export type SpinnerProps = UseProps<typeof SpinnerDescriptor, ISpinner>

export default {
	name: 'BaseSpinner',
	emits: emitsSpinner,
	props: propsSpinner,
}
