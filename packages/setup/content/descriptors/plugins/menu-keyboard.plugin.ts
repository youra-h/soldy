/**
 * Определение TMenuKeyboardPlugin (namespace `keyboard`) — клавиатура меню.
 *
 * Клавиатурная модель APG Menu Button: ↓, Enter и пробел на триггере
 * открывают меню на первом пункте, ↑ — на последнем; в панели ↑/↓ по кругу,
 * Home/End, набор по первым буквам. Фокус идёт за подсветкой, см.
 * `TMenuKeyboardPlugin`. Ставится после `TDismissPlugin`: панель находит он.
 *
 * Пропсов нет: подсветку теме отдаёт `data-highlighted` пункта
 * (`TListItemPlugin`), а остальное плагин делает сам.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuKeyboardPluginDescriptor = definePlugin({
	ctor: TMenuKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
