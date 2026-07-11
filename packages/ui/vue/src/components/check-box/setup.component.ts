import type { SetupContext } from 'vue'
import { TCheckBox, type ICheckBox, type ICheckBoxProps } from '@soldy/core'
import BaseCheckBox, { syncCheckBox } from './base.component'
import { createInputBoolBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import { useIconImport, useSplitAttrs } from '../../composables'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup(props: TBaseComponentViewProps<ICheckBoxProps, ICheckBox>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TCheckBox,
			plugins: createInputBoolBundle,
			sync: (ctx) => syncCheckBox(ctx),
		})(props, ctx)

		return {
			...base,
			defaultIconTag: useIconImport('check'),
			defaultIndeterminateIconTag: useIconImport('checkIndeterminate'),
			...useSplitAttrs(),
		}
	},
}
