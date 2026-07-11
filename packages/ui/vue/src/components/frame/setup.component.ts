import { TFrame } from '@soldy/core'
import BaseFrame, { syncFrame } from './base.component'
import { createFrameBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
	name: '_Frame',
	extends: BaseFrame,
	setup: useComponentSetup({
		Ctor: TFrame,
		plugins: createFrameBundle,
		sync: (ctx) => syncFrame(ctx),
	}),
}
