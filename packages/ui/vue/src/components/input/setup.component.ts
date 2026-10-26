import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	useExpose,
	roleIcon,
	useSplitAttrs,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseInput, { type InputProps } from './base.component'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	expose: useExpose(),
	setup(props: InputProps, { emit }: SetupContext) {
		// Поле формы `Field` над полем: ошибка, `id` и ссылки на части — от него
		const adapter = createVueAdapterContext(InputDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return extendBinding(useAdapter(adapter, props, emit), {
			...useSplitAttrs(),
			clearIconTag: roleIcon('close'),
		})
	},
}
