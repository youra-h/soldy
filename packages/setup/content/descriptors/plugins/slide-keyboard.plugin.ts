/**
 * Определение TSlideKeyboardPlugin (namespace `keyboard`) — клавиши и жест
 * скринридера у полей ручек.
 *
 * Стрелки, крупный шаг, Home и End переводит в команды владельца
 * (`ISlidable`) вместо нативного сдвига поля. Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TSlideKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SlideKeyboardPluginDescriptor = definePlugin({
	ctor: TSlideKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
