import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	roleIcon,
	useSplitAttrs,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseCheckBox, { type CheckBoxProps } from './base.component'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	expose: useExpose(),
	setup(props: CheckBoxProps, { emit }: SetupContext) {
		// Поле формы `Field` над флажком: ошибка, `id` и ссылки на части — от него
		const adapter = createVueAdapterContext(CheckBoxDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return {
			...useAdapter(adapter, props, emit),
			defaultIconTag: roleIcon('check'),
			defaultIndeterminateIconTag: roleIcon('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
