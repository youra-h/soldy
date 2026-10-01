/**
 * Определение TDialogIdsPlugin (namespace `ids`) — связки окна в документе:
 * имя от заголовка, как у любого модального слоя, и описание предупреждения —
 * `id` тела и `aria-describedby` окна.
 *
 * Пропсов нет: плагин пишет в наборы окна (`aria`, `titleAria`, `bodyAria`),
 * а их разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TDialogIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DialogIdsPluginDescriptor = definePlugin({
	ctor: TDialogIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
