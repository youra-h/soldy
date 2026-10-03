/**
 * Определение TDateInputTouchPlugin (namespace `touch`) — сенсорный режим поля
 * даты.
 *
 * Нажатие пальцем или пером делает части редактируемыми — для экранной
 * клавиатуры цифр, нажатие мышью возвращает их нередактируемыми — для
 * протяжки. Правку браузера переводит в команды ядра, после композиции
 * возвращает частям текст ядра; на сенсорных устройствах Apple даёт частям роль
 * `textbox` и имя поля. Своих пропсов и выходов нет: пишет в наборы частей.
 */

import { definePlugin } from '../../../protected/define'
import { TDateInputTouchPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DateInputTouchPluginDescriptor = definePlugin({
	ctor: TDateInputTouchPlugin,
	namespace: 'touch',
	contribution: { events: [...PLUGIN_EVENTS] },
})
