import { defineComponent, definePlugin } from '../define-component'
import { TObservingAccessorProvider } from '../../providers/components'
import { TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin } from '@soldy/plugins'
import { ComponentViewContribution } from '../../contributions/components'
import { ElementContribution, InstanceContribution } from '../../contributions/plugins'
import { TElementPluginAccessorProvider } from '../../providers/plugins/element'
import { TInstancePluginAccessorProvider } from '../../providers/plugins/instance'
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
