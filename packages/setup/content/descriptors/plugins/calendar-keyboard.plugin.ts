/**
 * Определение TCalendarKeyboardPlugin (namespace `keyboard`) — клавиши сетки
 * календаря по APG (Date Picker Dialog).
 *
 * Стрелки, Home/End и PageUp/PageDown переводят в команды фокуса коллекции,
 * Enter и пробел — в выбор дня, Escape — в отмену начатого диапазона; за
 * фокусом коллекции переносит DOM-фокус. Подключается после плагинов
 * коллекции — берёт у них движок и узлы дней. Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TCalendarKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const CalendarKeyboardPluginDescriptor = definePlugin({
	ctor: TCalendarKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
