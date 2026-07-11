import { TListBox } from '@soldy/core'
import BaseListBox, { syncListBox } from './base.component'
import { createListBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup: useComponentSetup({
		Ctor: TListBox,
		plugins: createListBundle,
		sync: (ctx) => syncListBox(ctx),
	}),
}
