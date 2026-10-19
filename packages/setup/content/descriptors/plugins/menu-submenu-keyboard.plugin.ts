/**
 * Определение TMenuSubmenuKeyboardPlugin (namespace `keyboard`) — клавиатура
 * пункта с подменю.
 *
 * Стрелка к концу строки, Enter и пробел на строке пункта открывают подменю
 * на первом пункте, стрелка к началу строки в его панели закрывает уровень;
 * в панели ↑/↓ по кругу, Home/End, набор по первым буквам. Фокус идёт за
 * подсветкой, см. `TMenuSubmenuKeyboardPlugin`. Ставится после
 * `TDismissPlugin`: панель находит он.
 *
 * Пропсов нет: подсветку теме отдаёт `data-highlighted` пункта
 * (`TListItemPlugin`), открытость — проп `open`.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuSubmenuKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuSubmenuKeyboardPluginDescriptor = definePlugin({
	ctor: TMenuSubmenuKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
