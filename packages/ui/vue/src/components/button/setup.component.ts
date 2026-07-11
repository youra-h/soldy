import { TButton } from '@soldy/core'
import BaseButton, { syncButton } from './base.component'
import { createComponentViewBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_Button',
	extends: BaseButton,
	setup: useComponentSetup({
		Ctor: TButton,
		plugins: createComponentViewBundle,
		sync: (ctx) => syncButton(ctx),
	}),
}
