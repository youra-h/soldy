/**
 * Определение TPopoverNamesPlugin (namespace `names`) — имя кнопки закрытия
 * поповера от локали.
 *
 * Пропсов нет: плагин пишет в набор поповера (`closeAria`), а его разметка
 * уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TPopoverNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const PopoverNamesPluginDescriptor = definePlugin({
	ctor: TPopoverNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
