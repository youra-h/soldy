import { toRaw } from 'vue'
import { createAdapterContext, CheckBoxDescriptor } from '@soldy/setup'
import { useAdapter, useIcon, useSplitAttrs } from '../../adapter'
import BaseCheckBox, { type CheckBoxProps } from './base.component'
import { type ICheckBoxProps, type ICheckBox } from '@soldy/core'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup(props: CheckBoxProps, { emit }: any) {
		const adapter = createAdapterContext(CheckBoxDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return {
			...useAdapter<ICheckBoxProps, ICheckBox>(adapter, props, emit),
			defaultIconTag: useIcon('check'),
			defaultIndeterminateIconTag: useIcon('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
