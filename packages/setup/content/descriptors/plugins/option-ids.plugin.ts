/**
 * Определение TOptionIdsPlugin (namespace `ids`) — `id` элемента списка в
 * документе: опции Select и элемента ListBox. На него ссылается
 * `aria-activedescendant` узла с фокусом — поля Select, узла списка ListBox.
 *
 * Пропсов нет: плагин пишет в `aria` элемента, а его разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TOptionIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const OptionIdsPluginDescriptor = definePlugin({
	ctor: TOptionIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
