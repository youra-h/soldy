import { toRaw } from 'vue'
import { createAdapterContext, CheckBoxDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseCheckBox, { type CheckBoxProps } from './base.component'
import { useIconImport, useSplitAttrs } from '../../composables'
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
			defaultIconTag: useIconImport('check'),
			defaultIndeterminateIconTag: useIconImport('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
