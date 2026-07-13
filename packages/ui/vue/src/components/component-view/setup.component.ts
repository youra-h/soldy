import type { SetupContext } from 'vue'
import { TComponentView, type IComponentViewProps, type IComponentView } from '@soldy/core'
import { componentViewContract } from '@soldy/core/adapter'
import BaseComponentView from './base.component'
import { useInstance } from '../../composables/useInstance'
import { vueAdapter } from '../../adapter/vueAdapter'
import type { TBaseComponentViewProps } from './types'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: TBaseComponentViewProps<IComponentViewProps, IComponentView>, { emit }: SetupContext) {
		const instance = useInstance(TComponentView, props)

		const { refs, plugins, rootElement } = vueAdapter(componentViewContract, instance, props, emit)

		return { ctrl: instance, plugins, rootElement, ...refs }
	},
}
