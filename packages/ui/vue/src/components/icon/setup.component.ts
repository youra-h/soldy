import { useAdapter } from '../../adapter'
import { IconDescriptor } from '@soldy/setup'
import BaseIcon from './base.component'
import type { TBaseComponentProps } from './../../types'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentProps<IIconProps, IIcon>, { emit }: any) {
		return useAdapter(IconDescriptor, props, emit)
	},
}
