/**
 * Определение TFieldNamesPlugin (namespace `names`) — имя кнопки очистки
 * поля от локали, вместе с именем поля.
 *
 * Пропсов нет: плагин пишет в набор поля (`clearAria`), а его разметка уже
 * раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TFieldNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const FieldNamesPluginDescriptor = definePlugin({
	ctor: TFieldNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
