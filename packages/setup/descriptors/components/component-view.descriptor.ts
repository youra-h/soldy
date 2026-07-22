import { defineComponent, definePlugin } from '../define-component'
import { TAccessorProvider } from '../../providers/components'
import { TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin } from '@soldy/plugins'
import { ComponentViewContribution } from '../../contributions/components'
import { ElementContribution } from '../../contributions/plugins'
import { TElementPluginAccessorProvider } from '../../providers/plugins/element'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineComponent({
	ctor: TComponentView,

	extends: ComponentDescriptor,

	contribution: ComponentViewContribution,

	plugins: [
		definePlugin({
			ctor: TElementPlugin,
			contribution: ElementContribution,
			provider: TElementPluginAccessorProvider,
		}),
		definePlugin({
			ctor: TInstancePlugin,
		}),
	],

	provider: TAccessorProvider,
})
