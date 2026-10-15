import { FrameDescriptor } from '@soldy-ui/setup'
import {
	exposeRoot,
	useAdapter,
	useExpose,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseFrame, { type FrameProps } from './base.component'

export default {
	name: '_Frame',
	extends: BaseFrame,
	expose: useExpose(),
	setup(props: FrameProps, { emit, expose }: SetupContext) {
		const adapter = createVueAdapterContext(FrameDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		const binding = useAdapter(adapter, props, emit)

		// Корень шаблона — телепорт: `$el` потребителю — панель, а не его якорь
		exposeRoot(expose, binding.rootElement)

		return binding
	},
}
