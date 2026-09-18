import { definePlugin } from '../../define'
import { TElementPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TElementServiceEvents } from '@soldy/plugins'

export const ElementPluginDescriptor = () =>
	definePlugin<'element', TElementServiceEvents>({
		ctor: TElementPlugin,
		namespace: 'element',
		contribution: {
			events: [...PLUGIN_EVENTS, 'ready', 'removed'],
		},
	})
