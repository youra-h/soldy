import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { tagsExtensions } from './factory'
import type { TTagsCollection } from './types'
import type { ITags } from '../types'
import type { ITagsItem } from '../item/types'

/**
 * Коллекция Tags целиком. `owner` необязателен: без него детали владельца не
 * ставятся — их доставит `<Tags>`, когда движок передадут компоненту.
 */
export function createEngineTags(
	options: TCreateEngineOptions<ITagsItem> & { owner?: ITags } = {},
): TTagsCollection {
	return createComponentEngine(tagsExtensions, options)
}
