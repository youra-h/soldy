import { useAdapter } from '../../adapter'
import { ComponentViewDescriptor } from '@soldy/setup'
import BaseComponentView from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: any, { emit }: any) {
		return useAdapter(ComponentViewDescriptor, props, emit)
	},
}
