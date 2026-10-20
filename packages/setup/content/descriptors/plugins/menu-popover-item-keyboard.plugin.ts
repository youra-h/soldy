/**
 * Определение TMenuPopoverItemKeyboardPlugin (namespace `keyboard`) —
 * клавиатура строки пункта меню с панелью.
 *
 * Стрелка к концу строки (в RTL ←) открывает панель, а уже открытую —
 * указателем, с фокусом на строке, — ведёт фокус в неё, и гасится; Enter и
 * пробел открывают панель кликом строки, см. `TMenuPopoverItemKeyboardPlugin`.
 * Ставится после модели фокуса пункта: берёт её при установке.
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
