import { IconDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseIcon, { type IconProps } from './base.component'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: IconProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(IconDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter<IIconProps, IIcon>(adapter, props, emit)
	},
}
