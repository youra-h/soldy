/**
 * Определение TModalNamesPlugin (namespace `names`) — имя кнопки закрытия
 * модального слоя от локали.
 *
 * Пропсов нет: плагин пишет в набор слоя (`closeAria`), а его разметка уже
 * раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TModalNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ModalNamesPluginDescriptor = definePlugin({
	ctor: TModalNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
