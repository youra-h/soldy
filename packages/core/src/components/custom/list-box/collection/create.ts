import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { listBoxExtensions } from './factory'
import type { TListBoxCollection } from './types'
import type { IListBox } from '../types'
import type { IListBoxItem } from '../item/types'

/**
 * Коллекция ListBox целиком. `owner` необязателен: без него детали владельца не
 * ставятся — их доставит `<ListBox>`, когда движок передадут компоненту.
 */
export function createEngineListBox(
	options: TCreateEngineOptions<IListBoxItem> & { owner?: IListBox } = {},
): TListBoxCollection {
	return createComponentEngine(listBoxExtensions, options)
}
