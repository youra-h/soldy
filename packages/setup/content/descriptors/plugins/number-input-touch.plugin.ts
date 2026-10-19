/**
 * Определение TNumberInputTouchPlugin (namespace `touch`) — поле числа на
 * сенсорных устройствах Apple.
 *
 * VoiceOver на iOS счётчик не фокусирует — плагин даёт полю роль `textbox`, а
 * полю с отрицательными — текстовую клавиатуру: у цифровой клавиатуры iOS
 * минуса нет. Своих пропсов и выходов нет: пишет в набор поля (`inputSets`).
 */

import { definePlugin } from '../../../protected/define'
import { TNumberInputTouchPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const NumberInputTouchPluginDescriptor = definePlugin({
	ctor: TNumberInputTouchPlugin,
	namespace: 'touch',
	contribution: { events: [...PLUGIN_EVENTS] },
})
