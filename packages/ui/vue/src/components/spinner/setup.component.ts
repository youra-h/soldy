import { toRaw } from 'vue'
import { createAdapterContext, SpinnerDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseSpinner from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ISpinnerProps, type ISpinner } from '@soldy/core'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: TBaseComponentProps<ISpinnerProps, ISpinner>, { emit }: any) {
		const adapter = createAdapterContext(SpinnerDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<ISpinnerProps, ISpinner>(adapter, props, emit)
	},
}
