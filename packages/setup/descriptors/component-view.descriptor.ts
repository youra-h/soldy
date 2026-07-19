/**
 * Дескриптор ComponentView (TComponentView).
 *
 * Единый источник истины: консолидирует Contribution + Provider + Constructor + Plugins.
 * Наследует ComponentDescriptor (rendered, visible, present) и добавляет
 * tag, classes + плагины Element, Instance.
 *
 * Заменяет ручную сборку:
 *   compileComponent([componentModel, ComponentViewContribution, ElementContribution, InstanceContribution])
 *   + ручную регистрацию провайдеров и бандла.
 */

import { defineComponent, definePlugin } from '@soldy/provider'
import { TObservingAccessorProvider } from '@soldy/provider'
import { TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin } from '@soldy/plugins'
import { ComponentViewContribution } from '../core/contributions'
import { ElementContribution, InstanceContribution } from '../plugins/contributions'
import { TElementPluginAccessorProvider } from '../plugins/providers/element'
import { TInstancePluginAccessorProvider } from '../plugins/providers/instance'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineComponent({
	ctor: TComponentView,

	extends: ComponentDescriptor,

	contribution: ComponentViewContribution,

	plugins: [
		definePlugin({
			plugin: TElementPlugin,
			contribution: ElementContribution,
			provider: TElementPluginAccessorProvider,
		}),
		definePlugin({
			plugin: TInstancePlugin,
			contribution: InstanceContribution,
			provider: TInstancePluginAccessorProvider,
		}),
	],

	provider: TObservingAccessorProvider,
})
