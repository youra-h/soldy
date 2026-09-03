import { toRaw } from 'vue'
import { createAdapterContext, IconDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseIcon from './base.component'
import type { TBaseComponentProps } from './../../types'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentProps<IIconProps, IIcon>, { emit }: any) {
		const adapter = createAdapterContext(IconDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IIconProps, IIcon>(adapter, props, emit)
	},
}
