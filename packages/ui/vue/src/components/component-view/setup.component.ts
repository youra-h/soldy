import type { SetupContext } from 'vue'
import { toRaw } from 'vue'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import { TComponentView } from '@soldy/core'
import { TInstancePlugin } from '@soldy/plugins'
import { ComponentViewDescriptor } from '@soldy/setup'
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
		const bundle = providedPlugins ?? ComponentViewDescriptor.createBundle()

		// 3. Настраиваем связи (ready-bridge)
		const instancePlugin = bundle.get(TInstancePlugin)!
		instancePlugin.instance = instance

		// 4. Создаём Runtime одной строкой
		const runtime = ComponentViewDescriptor.createRuntime({
			instance: toRaw(instance) as any,
			bundle,
		})

		// 5. Реактивные refs из Runtime (с автоподпиской)
		const { refs } = useComponentRuntime(runtime, props, emit)

		// 6. Привязка корневого DOM-элемента
		const rootElement = useElementBinding(bundle)

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	},
}
