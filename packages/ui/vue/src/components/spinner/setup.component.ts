import { SpinnerDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseSpinner, { type SpinnerProps } from './base.component'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: SpinnerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SpinnerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		return useAdapter(adapter, props, emit)
	},
}
