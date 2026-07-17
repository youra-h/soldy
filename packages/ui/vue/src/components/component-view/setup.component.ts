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
import {
	compileComponent,
	Runtime,
	AggregateAccessorProvider,
	ComponentAccessorProvider,
	ElementPluginAccessorProvider,
	InstancePluginAccessorProvider,
	ComponentContribution,
	ElementContribution,
	InstanceContribution,
} from '@soldy/host'
import { useElementBinding } from '../../composables/useElementBinding'
import { useComponentRuntime } from '../../composables/useComponentRuntime'
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

		// 4. Компилируем модель TComponentView
		const componentViewModel = compileComponent(
			[ComponentContribution, ElementContribution, InstanceContribution],
			[
				{ name: 'tag', kind: 'state', ownerId: ComponentContribution.id },
				{
					name: 'classes',
					kind: 'computed',
					ownerId: ComponentContribution.id,
				},
			],
			['ready'],
		)

		// 5. Строим провайдер доступа к свойствам
		const provider = new AggregateAccessorProvider()
		provider.addProvider(new ComponentAccessorProvider(instance as any))
		provider.addProvider(new ElementPluginAccessorProvider(elementPlugin))
		provider.addProvider(
			new InstancePluginAccessorProvider(instancePlugin),
		)

		// 6. Создаём Runtime
		const runtime = new Runtime(componentViewModel, provider)

		// 7. Реактивные refs из Runtime (с автоподпиской)
		const { refs } = useComponentRuntime(runtime, props, emit)

		// 8. Привязка корневого DOM-элемента
		const rootElement = useElementBinding(bundle)

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	},
}
