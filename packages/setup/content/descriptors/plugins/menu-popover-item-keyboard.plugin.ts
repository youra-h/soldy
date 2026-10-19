/**
 * Определение TMenuPopoverItemKeyboardPlugin (namespace `keyboard`) —
 * клавиатура строки пункта меню с панелью.
 *
 * Стрелка к концу строки (в RTL ←) открывает панель и гасится; Enter и пробел
 * открывают её кликом строки, см. `TMenuPopoverItemKeyboardPlugin`.
 *
 * Пропсов нет: открытость — проп `open` пункта.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuPopoverItemKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuPopoverItemKeyboardPluginDescriptor = definePlugin({
	ctor: TMenuPopoverItemKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
