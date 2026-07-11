import { TCheckBox } from '@soldy/core'
import BaseCheckBox, { syncCheckBox } from './base.component'
import { createInputBoolBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import { useIconImport, useSplitAttrs } from '../../composables'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup: useComponentSetup({
		Ctor: TCheckBox,
		createBundle: createInputBoolBundle,
		syncFn: (ctx) => syncCheckBox(ctx),
		extend: () => ({
			defaultIconTag: useIconImport('check'),
			defaultIndeterminateIconTag: useIconImport('checkIndeterminate'),
			...useSplitAttrs(),
		}),
	}),
}
