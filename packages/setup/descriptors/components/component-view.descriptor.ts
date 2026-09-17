import { defineComponent, defineDescriptor } from '../../define'
import { TComponentView } from '@soldy/core'
import type { IComponentViewProps, TComponentViewEvents } from '@soldy/core'
import { ElementPluginDescriptor, ReadyPluginDescriptor } from '../plugins'
import { ComponentViewContribution, type TComponentViewSlots } from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineDescriptor(() =>
	defineComponent<IComponentViewProps, TComponentViewEvents, TComponentViewSlots>()({
		ctor: TComponentView,

		extends: ComponentDescriptor(),

		contribution: ComponentViewContribution(),

		plugins: [ElementPluginDescriptor(), ReadyPluginDescriptor()],
	}),
)
