/**
 * Определение TListHeightPlugin (namespace `height`) — высота списка по `maxRows`.
 *
 * Применяет `maxRows` компонента (ListBox, Select) — предел высоты контейнера
 * элементов и прокрутка сверх него.
 */

import { definePlugin } from '../../define'
import { TListHeightPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ListHeightPluginDescriptor = () =>
	definePlugin({
		ctor: TListHeightPlugin,
		namespace: 'height',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
