/**
 * Определение TDateInputKeyboardPlugin (namespace `keyboard`) — клавиши поля
 * даты.
 *
 * Цифры, ↑/↓, Home/End, Backspace и Delete переводит в команды части под
 * фокусом, ←/→ — в переход к соседней части по направлению ряда, Ctrl/Cmd+A —
 * в выделение всей даты; за частью под фокусом ядра переносит DOM-фокус. Своих
 * пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TDateInputKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DateInputKeyboardPluginDescriptor = definePlugin({
	ctor: TDateInputKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
