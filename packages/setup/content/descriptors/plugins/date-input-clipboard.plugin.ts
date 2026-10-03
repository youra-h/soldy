/**
 * Определение TDateInputClipboardPlugin (namespace `clipboard`) — буфер обмена
 * и перетаскивание поля даты.
 *
 * Копирует и вырезает выделенное в ряду текстом узлов, вставку отдаёт ядру —
 * дата ISO или в формате поля заменяет всю дату. Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TDateInputClipboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DateInputClipboardPluginDescriptor = definePlugin({
	ctor: TDateInputClipboardPlugin,
	namespace: 'clipboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
