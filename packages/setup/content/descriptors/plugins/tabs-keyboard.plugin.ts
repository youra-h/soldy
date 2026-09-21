/**
 * Определение TTabsKeyboardPlugin (namespace `keyboard`) — клавиатура Tabs по APG Tabs.
 *
 * Стрелки и `Home`/`End` переносят фокус и активацию, `Delete` закрывает таб.
 * Подключается после плагинов коллекции — берёт у них движок и узлы табов.
 */

import { definePlugin } from '../../../protected/define'
import { TTabsKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const TabsKeyboardPluginDescriptor = definePlugin({
	ctor: TTabsKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
