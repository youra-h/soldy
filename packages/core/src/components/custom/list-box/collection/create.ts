import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { LIST_BOX_EXTENSIONS, LIST_BOX_OWNER_EXTENSIONS } from './factory'
import type { TListBoxCollection } from './types'
import type { IListBox } from '../types'

/**
 * Коллекция ListBox целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: связь `value` ↔ выбор и проброс `size`/`variant`
 * держатся на компоненте. Нужна коллекция без него — берите `createEngine`
 * или `createEngineSelection`: недостающее `<ListBox>` доустановит сам.
 */
export function createEngineListBox(
	options: TCreateEngineOptions & { owner: IListBox },
): TListBoxCollection {
	return createComponentEngine(
		'createEngineListBox',
		LIST_BOX_EXTENSIONS(),
		LIST_BOX_OWNER_EXTENSIONS,
		options,
	) as TListBoxCollection
}
