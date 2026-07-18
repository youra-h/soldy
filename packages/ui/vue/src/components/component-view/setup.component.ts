import type { SetupContext } from 'vue'
import { toRaw } from 'vue'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import { TComponentView } from '@soldy/core'
import {
	TElementPlugin,
	TInstancePlugin,
	TReadyBridgePlugin,
	createComponentViewBundle,
} from '@soldy/plugins'
import { TRuntime, TAggregateEventProvider } from '@soldy/provider'
import {
	TComponentAccessorProvider,
	TElementPluginAccessorProvider,
	TInstancePluginAccessorProvider,
} from '@soldy/setup'
import { useElementBinding } from '../../composables/useElementBinding'
import { useComponentRuntime } from '../../composables/useComponentRuntime'
import { componentViewModel } from './component-view.model'
import BaseComponentView from './base.component'
import type { TBaseComponentViewProps } from './types'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(
		props: TBaseComponentViewProps<IComponentViewProps, IComponentView>,
		{ emit }: SetupContext,
	) {
		// 1. Создаём или используем готовый core-экземпляр
		const providedCtrl = props.ctrl
		const instance: IComponentView =
			(providedCtrl ? toRaw(providedCtrl) : undefined) ??
			(new TComponentView({ props }) as unknown as IComponentView)

		// 2. Создаём или используем готовый бандл плагинов
		const providedPlugins = props.plugins
		const bundle = providedPlugins ?? createComponentViewBundle()
		const elementPlugin = bundle.get(TElementPlugin)!
		const instancePlugin = bundle.get(TInstancePlugin)!

		// 3. Настраиваем связи (ready-bridge)
		instancePlugin.instance = instance

		// 4. Строим провайдер
		const provider = new TAggregateEventProvider()
		provider.addProvider(new TComponentAccessorProvider(instance as any))
		provider.addProvider(new TElementPluginAccessorProvider(elementPlugin))
		provider.addProvider(new TInstancePluginAccessorProvider(instancePlugin))

		// 5. Создаём Runtime
		const runtime = new TRuntime(componentViewModel, provider)

		// 7. Реактивные refs из Runtime (с автоподпиской)
		const { refs } = useComponentRuntime(runtime, props, emit)

		// 8. Привязка корневого DOM-элемента
		const rootElement = useElementBinding(bundle)

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	},
}
