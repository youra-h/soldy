import { useAdapter } from '../../adapter'
import { SpinnerDescriptor } from '@soldy/setup'
import BaseSpinner from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ISpinnerProps, type ISpinner } from '@soldy/core'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: TBaseComponentProps<ISpinnerProps, ISpinner>, { emit }: any) {
		return useAdapter(SpinnerDescriptor, props, emit)
	},
}
