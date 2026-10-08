/**
 * Определение TTabsItemNamesPlugin (namespace `names`) — имя кнопки закрытия
 * таба от локали, вместе с текстом таба.
 *
 * Пропсов нет: плагин пишет в набор таба (`closeAria`), а его разметка уже
 * раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTabsItemNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TabsItemNamesPluginDescriptor = definePlugin({
	ctor: TTabsItemNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
