import type { SetupContext } from 'vue'
import { TIcon, type IIconProps, type IIcon } from '@soldy/core'
import BaseIcon, { syncIcon } from './base.component'
import { createComponentViewBundle, TIconStylePlugin } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentViewProps<IIconProps, IIcon>, ctx: SetupContext) {
		return useComponentSetup({
			Ctor: TIcon,
			plugins: () => createComponentViewBundle().use(TIconStylePlugin),
			sync: (ctx) => syncIcon(ctx),
		})(props, ctx)
	},
}
