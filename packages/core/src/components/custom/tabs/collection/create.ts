import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { tabsExtensions } from './factory'
import type { TTabsCollection } from './types'
import type { ITabs } from '../types'
import type { ITabsItem } from '../item/types'

/**
 * Коллекция Tabs целиком. `owner` необязателен: владелец — опция движка, его
 * пишет `<Tabs>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 */
export function createEngineTabs(
	options: TCreateEngineOptions<ITabsItem> & { owner?: ITabs } = {},
): TTabsCollection {
	return createComponentEngine(tabsExtensions(), options)
}
