/**
 * Определение TNumberInputKeyboardPlugin (namespace `keyboard`) — клавиши поля
 * числа.
 *
 * ↑/↓ — шаг, Shift со стрелкой, PageUp и PageDown — крупный шаг, Home и End —
 * к заданной границе, каждая — с `commit`; Enter закрывает набор, не мешая
 * отправке формы. Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TNumberInputKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const NumberInputKeyboardPluginDescriptor = definePlugin({
	ctor: TNumberInputKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
