import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { menuExtensions } from './factory'
import type { TMenuCollection } from './types'
import type { IMenuOwner } from '../types'
import type { IMenuItem } from '../item/types'

/**
 * Коллекция меню целиком. `owner` необязателен: владелец — опция движка, его
 * пишет `<Menu>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 */
export function createEngineMenu(
	options: TCreateEngineOptions<IMenuItem> & { owner?: IMenuOwner<any> } = {},
): TMenuCollection {
	return createComponentEngine(menuExtensions(), options)
}
