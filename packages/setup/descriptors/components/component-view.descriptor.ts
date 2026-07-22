import { defineComponent, definePlugin } from '../base'
import { TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin } from '@soldy/plugins'
import { ComponentViewContribution, ElementContribution } from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineComponent({
	ctor: TComponentView,

	extends: ComponentDescriptor,

	contribution: ComponentViewContribution,

	plugins: [
		definePlugin({
			ctor: TElementPlugin,
			contribution: ElementContribution,
		}),
		definePlugin({
			ctor: TInstancePlugin,
		}),
	],
})
