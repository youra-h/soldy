/**
 * Определение TFieldIdsPlugin (namespace `ids`) — связки поля формы в
 * документе: `id` подписи, подсказки и ошибки, `for` подписи и ссылки
 * контрола на видимые части.
 *
 * Пропсов нет: `id` и `for` плагин пишет в наборы частей поля (`labelAria`,
 * `helperAria`, `errorAria`), а их разметка уже раскладывает. Ссылки контрола
 * на части разметке не нужны — их берёт связка поля с контролом
 * (`TFieldControlExtension`).
 */

import { definePlugin } from '../../../protected/define'
import { TFieldIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const FieldIdsPluginDescriptor = definePlugin({
	ctor: TFieldIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
