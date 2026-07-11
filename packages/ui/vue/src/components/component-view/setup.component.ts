import { TComponentView } from '@soldy/core'
import BaseComponentView, { syncComponentView } from './base.component'
import { createComponentViewBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup: useComponentSetup({
		Ctor: TComponentView,
		plugins: createComponentViewBundle,
		sync: (ctx) => syncComponentView(ctx),
	}),
}
