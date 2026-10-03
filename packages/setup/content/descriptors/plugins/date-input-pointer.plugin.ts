/**
 * Определение TDateInputPointerPlugin (namespace `pointer`) — указатель поля
 * даты.
 *
 * Нажатие мимо частей отдаёт фокус ближайшей части, контекстное меню над рядом
 * делает ряд на время редактируемым — ради «Вставить» и «Вырезать». Своих
 * пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TDateInputPointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DateInputPointerPluginDescriptor = definePlugin({
	ctor: TDateInputPointerPlugin,
	namespace: 'pointer',
	contribution: { events: [...PLUGIN_EVENTS] },
})
