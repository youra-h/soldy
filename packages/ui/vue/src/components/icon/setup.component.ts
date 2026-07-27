import { toRaw } from 'vue'
import { createAdapterContext, IconDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseIcon from './base.component'
import type { TBaseComponentProps } from './../../types'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentProps<IIconProps, IIcon>, { emit }: any) {
		const adapter = createAdapterContext(IconDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})

		return useVue<IIconProps, IIcon>(adapter, props, emit)
	},
}
