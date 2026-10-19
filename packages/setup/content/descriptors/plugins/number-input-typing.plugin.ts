/**
 * Определение TNumberInputTypingPlugin (namespace `typing`) — набор в поле
 * числа.
 *
 * Правку, текст которой ядро не возьмёт (буква, второй разделитель, минус у
 * поля без отрицательных), гасит до того, как она встанет в поле; набранное
 * отдаёт ядру, а на его отказ возвращает полю текст ядра; уход фокуса с ввода
 * закрывает набор (`commit`). Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TNumberInputTypingPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const NumberInputTypingPluginDescriptor = definePlugin({
	ctor: TNumberInputTypingPlugin,
	namespace: 'typing',
	contribution: { events: [...PLUGIN_EVENTS] },
})
