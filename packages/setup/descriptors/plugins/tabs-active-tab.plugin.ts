import { definePlugin } from '../base'
import { TTabsActiveTabPlugin } from '@soldy/plugins'

/**
 * Плагин вычисления позиции/размера активного таба.
 */
export const TabsActiveTabPluginDescriptor = definePlugin({
	ctor: TTabsActiveTabPlugin,
})
