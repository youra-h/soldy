import { FrameDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseFrame, { type FrameProps } from './base.component'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup(props: FrameProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(FrameDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		return useAdapter(adapter, props, emit)
	},
}
