/**
 * Определение TDialogNamesPlugin (namespace `names`) — имена кнопок окна от
 * локали: закрытия, как у любого модального слоя, и разворота.
 *
 * Пропсов нет: плагин пишет в наборы окна (`closeAria`, `maximizeAria`), а
 * их разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TDialogNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DialogNamesPluginDescriptor = definePlugin({
	ctor: TDialogNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
