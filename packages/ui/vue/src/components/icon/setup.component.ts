import { useAdapter } from '../../adapter'
import { IconDescriptor } from '@soldy/setup'
import BaseIcon from './base.component'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: any, { emit }: any) {
		return useAdapter(IconDescriptor, props, emit)
	},
}
