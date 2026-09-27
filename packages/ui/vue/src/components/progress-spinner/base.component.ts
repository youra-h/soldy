import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { IProgressSpinner } from '@soldy-ui/core'

export const emitsProgressSpinner: TEmits = useEmits(ProgressSpinnerDescriptor())

export const propsProgressSpinner: TProps = useProps(ProgressSpinnerDescriptor()) as TProps

export type ProgressSpinnerProps = UseProps<typeof ProgressSpinnerDescriptor, IProgressSpinner>

export default {
	name: 'BaseProgressSpinner',
	emits: emitsProgressSpinner,
	props: propsProgressSpinner,
}
