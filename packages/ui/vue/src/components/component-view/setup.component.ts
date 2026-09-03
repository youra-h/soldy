import { toRaw } from 'vue'
import { createAdapterContext, ComponentViewDescriptor } from '@soldy/setup'
import { useAdapter } from '../../adapter'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import type { TBaseComponentProps } from './../../types'
import BaseComponentView from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: TBaseComponentProps<IComponentViewProps, IComponentView>, { emit }: any) {
		const adapter = createAdapterContext(ComponentViewDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		return useAdapter<IComponentViewProps, IComponentView>(adapter, props, emit)
	},
}
