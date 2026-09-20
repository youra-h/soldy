import { CheckBoxDescriptor } from '@soldy/setup'
import {
	useAdapter,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseCheckBox, { type CheckBoxProps } from './base.component'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup(props: CheckBoxProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(CheckBoxDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return {
			...useAdapter(adapter, props, emit),
			defaultIconTag: useIcon('check'),
			defaultIndeterminateIconTag: useIcon('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
