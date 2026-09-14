import { SpinnerDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseSpinner, { type SpinnerProps } from './base.component'
import { type ISpinnerProps, type ISpinner } from '@soldy/core'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: SpinnerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SpinnerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<ISpinnerProps, ISpinner>(adapter, props, emit)
	},
}
