/**
 * Определение TCalendarPointerPlugin (namespace `pointer`) — указатель
 * календаря.
 *
 * Нажатие по дню выбирает его, по кнопке листания — листает, наведение
 * сообщает коллекции день под указателем для предпросмотра диапазона.
 * Подключается после плагинов коллекции — берёт у них движок и узлы дней.
 * Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TCalendarPointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const CalendarPointerPluginDescriptor = definePlugin({
	ctor: TCalendarPointerPlugin,
	namespace: 'pointer',
	contribution: { events: [...PLUGIN_EVENTS] },
})
