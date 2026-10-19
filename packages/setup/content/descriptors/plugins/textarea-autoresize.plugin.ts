/**
 * Определение TTextareaAutoresizePlugin (namespace `autoresize`) — высота
 * Textarea по содержимому.
 *
 * Применяет `autoresize`, `rows` и `maxRows` компонента: инлайновая высота
 * `<textarea>` от `rows` до `maxRows` строк, прокрутка — только на потолке.
 * Пропсов нет: свойства лежат на инстансе, плагин их читает.
 */

import { definePlugin } from '../../../protected/define'
import { TTextareaAutoresizePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TextareaAutoresizePluginDescriptor = definePlugin({
	ctor: TTextareaAutoresizePlugin,
	namespace: 'autoresize',
	contribution: { events: [...PLUGIN_EVENTS] },
})
