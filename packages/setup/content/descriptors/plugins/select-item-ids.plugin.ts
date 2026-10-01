/**
 * Определение TSelectItemIdsPlugin (namespace `ids`) — `id` опции Select в
 * документе: на него ссылается `aria-activedescendant` поля.
 *
 * Пропсов нет: плагин пишет в `aria` опции, а его разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TSelectItemIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SelectItemIdsPluginDescriptor = definePlugin({
	ctor: TSelectItemIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
