import { defineComponent } from '../base'
import { TComponentView } from '@soldy/core'
import { ElementPluginDescriptor, ReadyPluginDescriptor } from '../plugins'
import { ComponentViewContribution } from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineComponent({
	ctor: TComponentView,

	extends: ComponentDescriptor,

	contribution: ComponentViewContribution,

	plugins: [ElementPluginDescriptor, ReadyPluginDescriptor],
})
