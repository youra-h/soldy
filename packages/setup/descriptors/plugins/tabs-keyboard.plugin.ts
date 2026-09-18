import { definePlugin } from '../../define'
import { TTabsKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Клавиатура Tabs по паттерну APG Tabs: стрелки и `Home`/`End` переносят
 * фокус и активацию, `Delete` закрывает таб. Подключается после плагинов
 * коллекции — берёт у них движок и узлы табов.
 */
export const TabsKeyboardPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsKeyboardPlugin,
		namespace: 'keyboard',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
