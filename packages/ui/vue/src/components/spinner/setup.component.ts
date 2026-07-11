import type { SetupContext } from 'vue'
import { TSpinner, type ISpinnerProps, type ISpinner } from '@soldy/core'
import BaseSpinner, { syncSpinner } from './base.component'
import { createComponentViewBundle, TSpinnerStylePlugin } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: TBaseComponentViewProps<ISpinnerProps, ISpinner>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TSpinner,
			plugins: createComponentViewBundle,
			sync: (ctx) => syncSpinner(ctx),
		})(props, ctx)

		base.plugins.use(TSpinnerStylePlugin)

		return base
	},
}
