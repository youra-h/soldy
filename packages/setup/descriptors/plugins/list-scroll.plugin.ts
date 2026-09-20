/**
 * Определение TListScrollPlugin (namespace `scroll`) — прокрутка списка к выделенному.
 */

import { definePlugin } from '../../define'
import { TListScrollPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ListScrollPluginDescriptor = definePlugin({
	ctor: TListScrollPlugin,
	namespace: 'scroll',
	contribution: { events: [...PLUGIN_EVENTS] },
})
