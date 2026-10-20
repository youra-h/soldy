/**
 * Определение TTextareaIdsPlugin (namespace `ids`) — связка «поле ↔ счётчик
 * символов» Textarea в документе: пока счётчик включён, `id` счётчика — в
 * `counterAria`, ссылка на него — в `aria-describedby` поля.
 *
 * Пропсов нет: `id` плагин пишет в набор счётчика (`counterAria`), а ссылку —
 * третьим входом `TAriaPlugin` поля, в его `aria`; оба набора разметка уже
 * раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTextareaIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TextareaIdsPluginDescriptor = definePlugin({
	ctor: TTextareaIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
