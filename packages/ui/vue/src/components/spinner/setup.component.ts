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
		return useComponentSetup({
			Ctor: TSpinner,
			plugins: () => createComponentViewBundle().use(TSpinnerStylePlugin),
			sync: (ctx) => syncSpinner(ctx),
		})(props, ctx)
	},
}
