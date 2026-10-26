import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	useExpose,
	useSplitAttrs,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseSwitch, { type SwitchProps } from './base.component'

export default {
	name: '_Switch',
	inheritAttrs: false,
	extends: BaseSwitch,
	expose: useExpose(),
	setup(props: SwitchProps, { emit }: SetupContext) {
		// Поле формы `Field` над переключателем: ошибка, `id` и ссылки на части — от него
		const adapter = createVueAdapterContext(SwitchDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return extendBinding(useAdapter(adapter, props, emit), useSplitAttrs())
	},
}
