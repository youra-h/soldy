/**
 * Определение TTagsItemNamesPlugin (namespace `names`) — имя кнопки закрытия
 * тега от локали, вместе с текстом тега.
 *
 * Пропсов нет: плагин пишет в набор тега (`closeAria`), а его разметка уже
 * раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTagsItemNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TagsItemNamesPluginDescriptor = definePlugin({
	ctor: TTagsItemNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
