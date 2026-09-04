import { toRaw } from 'vue'
import { createAdapterContext, IconDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import BaseIcon, { type IconProps } from './base.component'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: IconProps, { emit }: any) {
		const adapter = createAdapterContext(IconDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IIconProps, IIcon>(adapter, props, emit)
	},
}
