import { TCollapse } from '@soldy/core'
import BaseCollapse, { syncCollapse } from './base.component'
import { createCollapseBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup: useComponentSetup({
		Ctor: TCollapse,
		plugins: createCollapseBundle,
		sync: (ctx) => syncCollapse(ctx),
	}),
}
