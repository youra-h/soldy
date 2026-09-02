import { useAdapter } from '../../adapter'
import { CheckBoxDescriptor } from '@soldy/setup'
import BaseCheckBox from './base.component'
import { useIconImport, useSplitAttrs } from '../../composables'
import type { TBaseComponentProps } from '../../types'
import { type ICheckBoxProps, type ICheckBox } from '@soldy/core'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup(props: TBaseComponentProps<ICheckBoxProps, ICheckBox>, { emit }: any) {
		return {
			...useAdapter(CheckBoxDescriptor, props, emit),
			defaultIconTag: useIconImport('check'),
			defaultIndeterminateIconTag: useIconImport('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
