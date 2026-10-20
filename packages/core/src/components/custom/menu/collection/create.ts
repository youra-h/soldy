import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCollectionEngineItemSource } from '../../../base'
import { menuExtensions } from './factory'
import type { IMenuItemSource, TMenuCollection } from './types'
import type { IMenuOwner } from '../types'
import type { IMenuItem } from '../item/types'

/**
 * Коллекция меню целиком. `owner` необязателен: владелец — опция движка, его
 * пишет `<Menu>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 *
 * Пункт данными с вложенным `items` — подменю со своей коллекцией, на любом
 * уровне (`IMenuItemSource`).
 */
export function createEngineMenu(
	options: {
		items?: readonly (TCollectionEngineItemSource<IMenuItemSource> | IMenuItem)[]
		owner?: IMenuOwner<any>
	} = {},
): TMenuCollection {
	return createComponentEngine(menuExtensions(), options)
}
