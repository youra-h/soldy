import { SpinnerDescriptor, type DescriptorPluginOutputs } from '@soldy/setup'
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

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		return useAdapter<
			ISpinnerProps,
			ISpinner,
			DescriptorPluginOutputs<typeof SpinnerDescriptor>
		>(adapter, props, emit)
	},
}
