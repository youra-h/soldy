import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { selectExtensions } from './factory'
import type { TSelectCollection } from './types'
import type { ISelect } from '../types'
import type { ISelectItem } from '../item/types'

/**
 * Коллекция Select целиком. `owner` необязателен: владелец — опция движка, его
 * пишет `<Select>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 */
export function createEngineSelect(
	options: TCreateEngineOptions<ISelectItem> & { owner?: ISelect } = {},
): TSelectCollection {
	return createComponentEngine(selectExtensions(), options)
}
