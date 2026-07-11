import { TTabs } from '@soldy/core'
import BaseTabs, { syncTabs } from './base.component'
import { createTabsBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup: useComponentSetup({
		Ctor: TTabs,
		plugins: createTabsBundle,
		sync: (ctx) => syncTabs(ctx),
	}),
}
